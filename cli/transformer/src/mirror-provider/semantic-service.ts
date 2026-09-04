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
	nodes: Map<string, ts.Node>
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

	/** Source identity changes invalidate the corresponding mirror. */
	private contexts = new WeakMap<ts.SourceFile, MirrorSemanticContext | null>()

	constructor(private program: ts.Program, private host: ts.CompilerHost) {}

	/** Get the same mirror context for both diagnostics and mapped queries. */
	getContext(source: ts.SourceFile): MirrorSemanticContext | null {
		if (!this.contexts.has(source)) {
			this.contexts.set(source, this.buildContext(source))
		}

		return this.contexts.get(source)!
	}

	/** Build a source mirror without disturbing the transformer's active scope. */
	private buildContext(source: ts.SourceFile): MirrorSemanticContext | null {
		if (source.isDeclarationFile) {
			return null
		}

		let document = buildTypeScriptMirror(ts, this.program, source)
		if (!document) {
			return null
		}

		let program = createMirrorProgram(this.program, this.host, document)
		let sourceFile = program.getSourceFile(source.fileName)!
		let checker = program.getTypeChecker()
		let nodes = new Map<string, ts.Node>()

		let visit = (node: ts.Node) => {
			nodes.set(nodeKey(node.getStart(sourceFile), node.end, node.kind), node)
			ts.forEachChild(node, visit)
		}

		visit(sourceFile)
		return {document, program, sourceFile, checker, nodes}
	}

	/** Resolve a complete node span; ordinary nodes retain their original checker. */
	resolveNode(node: ts.Node): MappedSemanticNode {
		let source = node.getSourceFile()
		let context = source ? this.getContext(source) : null

		if (context) {
			let start = node.getStart(source)

			let mappings = context.document.mappings.filter(mapping =>
				mapping.kind === 'copied-expression'
				&& mapping.originalStart <= start && mapping.originalEnd >= node.end
				&& mapping.mirrorEnd - mapping.mirrorStart === mapping.originalEnd - mapping.originalStart
			).sort((a, b) => a.originalEnd - a.originalStart - (b.originalEnd - b.originalStart))

			for (let mapping of mappings) {
				let offset = mapping.mirrorStart - mapping.originalStart
				let mirrored = context.nodes.get(nodeKey(start + offset, node.end + offset, node.kind))

				if (mirrored) {
					return {node: mirrored, checker: context.checker}
				}
			}
		}

		return {node, checker: this.program.getTypeChecker()}
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
