import ts from 'typescript'
import {buildTypeScriptMirror} from '../lupos-ts-module/ts-mirror/mirror-builder'
import {MirrorDocument} from '../lupos-ts-module/ts-mirror/types'
import {createMirrorBuilderProgram} from './mirror-program'


/** The semantic program and source mappings for one original source file. */
export interface MirrorSemanticContext {
	document: MirrorDocument
	program: ts.Program
	sourceFile: ts.SourceFile
	checker: ts.TypeChecker
	nodes: Map<string, ts.Node> | null
}

/** A resolved node must always be queried with its owning checker. */
export interface MappedSemanticNode {
	node: ts.Node
	checker: ts.TypeChecker
}


/**
 * Services are keyed by original Program revision.
 *
 * A Program is immutable, so everything cached by its service remains valid for
 * that complete revision. Weak keys let TypeScript release an old Program and
 * its mirror service together after watch mode advances to a newer revision.
 */
const Services = new WeakMap<ts.Program, MirrorSemanticService>()


/** Get the program-wide service shared by diagnostics and transformation. */
export function getMirrorSemanticService(
	program: ts.Program,
	host?: ts.CompilerHost,
	previousProgram?: ts.Program
): MirrorSemanticService {
	let service = Services.get(program)

	if (!service) {
		let previousService = previousProgram ? Services.get(previousProgram) : undefined
		service = new MirrorSemanticService(
			program,
			host ?? ts.createCompilerHost(program.getCompilerOptions()),
			previousService
		)
		Services.set(program, service)
	}

	return service
}


/** Builds mirrors once and resolves original nodes in their semantic copies. */
export class MirrorSemanticService {

	/**
	 * Resolved mirror contexts keyed by SourceFile identity in the current Program.
	 * `null` is a cached result: the source has no mirror and must use native types.
	 */
	private contexts = new WeakMap<ts.SourceFile, MirrorSemanticContext | null>()

	/**
	 * Lazily built documents keyed by current SourceFile identity.
	 * Keeping this separate from contexts lets the compiler host request documents
	 * while the shared mirror Program is still being constructed.
	 */
	private documents = new WeakMap<ts.SourceFile, MirrorDocument | null>()

	/** Whether the builder's affected-file diagnostics queue has been drained. */
	private diagnosticsInitialized: boolean = false

	/** Whether the shared mirror builder and all current source contexts exist. */
	private initialized: boolean = false

	/** One incremental mirror Program shared by all files in this revision. */
	private mirrorBuilder: ts.SemanticDiagnosticsBuilderProgram | null = null

	/** Original checker, created only when a node has no semantic mirror copy. */
	private originalChecker: ts.TypeChecker | null = null

	/** Immutable original Program represented by this service. */
	private program: ts.Program

	/** Original host reused as the base of the secondary mirror host. */
	private host: ts.CompilerHost

	/**
	 * Previous revision retained only until initialization can reuse its builder
	 * and unchanged documents, then released to avoid extending its cache lifetime.
	 */
	private previousService: MirrorSemanticService | null

	constructor(program: ts.Program, host: ts.CompilerHost, previousService?: MirrorSemanticService) {
		this.program = program
		this.host = host
		this.previousService = previousService ?? null
	}

	/** Get the same mirror context for both diagnostics and mapped queries. */
	getContext(source: ts.SourceFile): MirrorSemanticContext | null {
		if (!this.initialized) {
			this.initialize()
		}

		return this.contexts.get(source) ?? null
	}

	/** Create the shared Program and build mirrors as its host requests sources. */
	private initialize() {

		// Passing the previous builder lets TypeScript reuse unchanged parsed files,
		// module resolution, and semantic dependency state across watch revisions.
		let oldMirrorBuilder = this.previousService?.initialized
			? this.previousService.mirrorBuilder ?? undefined
			: undefined

		let mirrorBuilder = createMirrorBuilderProgram(this.program, this.host, source => {

			// SourceFile objects change between Program revisions. Reuse therefore
			// compares the canonical file lookup and source text in the old Program,
			// rather than relying on object identity.
			let previousDocument = this.getPreviousDocument(source)
			if (previousDocument !== undefined) {
				this.documents.set(source, previousDocument)
				return previousDocument
			}

			let document = source.isDeclarationFile
				? null
				: buildTypeScriptMirror(ts, this.program, source)

			this.documents.set(source, document)
			return document
		}, oldMirrorBuilder)

		let program = mirrorBuilder.getProgram()
		let checker = program.getTypeChecker()

		// The mirror host is lazy, so TypeScript may not request every source while
		// constructing the Program. Complete both caches here; an absent document is
		// deliberately stored as `null` so later queries do not rebuild it.
		for (let source of this.program.getSourceFiles()) {
			let document = this.documents.has(source)
				? this.documents.get(source)!
				: this.getPreviousDocument(source) ?? null

			this.documents.set(source, document)

			if (document) {
				let sourceFile = program.getSourceFile(source.fileName)!
				this.contexts.set(source, {document, program, sourceFile, checker, nodes: null})
			}
			else {
				this.contexts.set(source, null)
			}
		}
		
		this.mirrorBuilder = mirrorBuilder
		this.previousService = null
		this.initialized = true
	}

	/** Get cached or affected semantic diagnostics from the shared mirror builder. */
	getSemanticDiagnostics(
		context: MirrorSemanticContext,
		cancellationToken?: ts.CancellationToken
	): readonly ts.Diagnostic[] {
		if (!this.diagnosticsInitialized) {

			// A builder tracks an affected-file queue independently of direct per-file
			// queries. Advance it once so subsequent queries observe the current graph
			// and can use TypeScript's cached diagnostics for unaffected files.
			this.mirrorBuilder!.getSemanticDiagnostics(undefined, cancellationToken)
			this.diagnosticsInitialized = true
		}

		return this.mirrorBuilder!.getSemanticDiagnostics(context.sourceFile, cancellationToken)
	}

	/**
	 * Get a document cached for the same unchanged source in the previous revision.
	 * `undefined` means it must be rebuilt; `null` means the previous build already
	 * proved that this source needs no mirror and that result can also be reused.
	 */
	private getPreviousDocument(source: ts.SourceFile): MirrorDocument | null | undefined {
		let previous = this.previousService
		if (!previous?.initialized) {
			return undefined
		}

		let previousSource = previous.program.getSourceFile(source.fileName)
		if (!previousSource
			|| previousSource.text !== source.text
			|| !previous.documents.has(previousSource)
		) {
			return undefined
		}

		return previous.documents.get(previousSource)!
	}

	/** Resolve a complete node span; ordinary nodes retain their original checker. */
	resolveNode(node: ts.Node): MappedSemanticNode {
		let source = node.getSourceFile()
		let context = source ? this.getContext(source) : null

		if (context) {
			let start = node.getStart(source)
			let nodes = this.getNodes(context)

			let mappings = context.document.mappings.filter(mapping =>
				mapping.kind === 'copied-expression'
				&& mapping.originalStart <= start
				&& mapping.originalEnd >= node.end
				&& mapping.mirrorEnd - mapping.mirrorStart === mapping.originalEnd - mapping.originalStart
			).sort((a, b) => a.originalEnd - a.originalStart - (b.originalEnd - b.originalStart))

			for (let mapping of mappings) {
				let offset = mapping.mirrorStart - mapping.originalStart
				let mirrored = nodes.get(nodeKey(start + offset, node.end + offset, node.kind))

				if (mirrored) {
					return {node: mirrored, checker: context.checker}
				}
			}
		}

		this.originalChecker ??= this.program.getTypeChecker()
		return {node, checker: this.originalChecker}
	}

	/** Build the exact-node index only when a mapped type query needs it. */
	private getNodes(context: MirrorSemanticContext): Map<string, ts.Node> {
		if (context.nodes) {
			return context.nodes
		}

		// Indexing every mirror AST node is unnecessary for diagnostics. Delay the
		// traversal until transformation asks for a type from a copied expression.
		let nodes = new Map<string, ts.Node>()
		let visit = (node: ts.Node) => {
			nodes.set(nodeKey(node.getStart(context.sourceFile), node.end, node.kind), node)
			ts.forEachChild(node, visit)
		}

		visit(context.sourceFile)
		context.nodes = nodes
		return nodes
	}

	/** Query a mapped type without mixing types from different checkers. */
	getType(node: ts.Node) {
		let resolved = this.resolveNode(node)
		return {...resolved, type: resolved.checker.getTypeAtLocation(resolved.node)}
	}
}


/** Index nodes by exact span and kind, including expressions sharing a start. */
function nodeKey(start: number, end: number, kind: ts.SyntaxKind): string {
	return `${start}:${end}:${kind}`
}
