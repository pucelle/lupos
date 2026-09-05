import ts from 'typescript'
import {buildTypeScriptMirror} from '../lupos-ts-module/ts-mirror/mirror-builder'
import {MirrorDocument} from '../lupos-ts-module/ts-mirror/types'
import {createMirrorProgram} from './mirror-program'


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


/** Services expire with the original program, including incremental rebuilds. */
const Services = new WeakMap<ts.Program, MirrorSemanticService>()


/** Get the program-wide service shared by diagnostics and transformation. */
export function getMirrorSemanticService(program: ts.Program, host?: ts.CompilerHost): MirrorSemanticService {
	let service = Services.get(program)

	if (!service) {
		service = new MirrorSemanticService(program, host ?? ts.createCompilerHost(program.getCompilerOptions()))
		Services.set(program, service)
	}

	return service
}


/** Builds mirrors once and resolves original nodes in their semantic copies. */
export class MirrorSemanticService {

	/** All contexts share one mirror program for this original program revision. */
	private contexts = new WeakMap<ts.SourceFile, MirrorSemanticContext | null>()
	private initialized: boolean = false
	private originalChecker: ts.TypeChecker | null = null
	private program: ts.Program
	private host: ts.CompilerHost

	constructor(program: ts.Program, host: ts.CompilerHost) {
		this.program = program
		this.host = host
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
		let documents = new Map<ts.SourceFile, MirrorDocument>()
		let program = createMirrorProgram(this.program, this.host, source => {
			if (source.isDeclarationFile) {
				return null
			}

			let document = buildTypeScriptMirror(ts, this.program, source)
			if (document) {
				documents.set(source, document)
			}

			return document
		})
		
		let checker = program.getTypeChecker()

		for (let source of this.program.getSourceFiles()) {
			let document = documents.get(source)
			if (document) {
				let sourceFile = program.getSourceFile(source.fileName)!
				this.contexts.set(source, {document, program, sourceFile, checker, nodes: null})
			}
			else {
				this.contexts.set(source, null)
			}
		}
		
		this.initialized = true
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
