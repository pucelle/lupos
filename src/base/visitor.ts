import type TS from 'typescript'
import {VisitTree} from './visit-tree'
import {Interpolator} from './interpolator'
import {TransformerExtras} from 'ts-patch'
import {setGlobal, setSourceFile, setTransformContext} from './global'
import {ScopeTree} from './scope-tree'
import {callVisitedSourceFileCallbacks, runPostVisitCallbacks, runPreVisitCallbacks} from './visitor-callbacks'
import {DiagnosticModifier} from './diagnostics'


/** 
 * It accepts a node,
 * can either return a function, which will be called after visited all children,
 * or return void to do nothing more.
 */
type VisitFunction = (node: TS.Node, index: number) => (() => void) | void


/** All defined visitors. */
const Visitors: VisitFunction[] = []


/** 
 * Define a visitor, and push it to visitor list.
 * `visit` will visit each node in depth-first order,
 * so you don't need to visit child nodes in each defined visitor.
 */
export function defineVisitor(visitor: VisitFunction) {
	Visitors.push(visitor)
}


/** 
 * Apply defined visitors to a node.
 * Returns a function, which will be called after visited all children.
 */
function applyVisitors(node: TS.Node): () => void {
	let doMoreAfterVisitedChildren: Function[] = []
	let index = VisitTree.getIndex(node)

	for (let visitor of Visitors) {
		let more = visitor(node, index)
		if (more) {
			doMoreAfterVisitedChildren.push(more)
		}
	}

	return () => {
		for (let fn of doMoreAfterVisitedChildren) {
			fn()
		}
	}
}


/** Transformer entry. */
export function transformer(program: TS.Program, extras: TransformerExtras) {
	let {ts} = extras
	setGlobal(program, extras)

	// Must after `setGlobal`.
	DiagnosticModifier.initialize()

	return (ctx: TS.TransformationContext) => {
		setTransformContext(ctx)

		return (sourceFile: TS.SourceFile) => {
			setSourceFile(sourceFile)
			runPreVisitCallbacks()

			// In the first visiting initialize visit and scope tree.
			function initVisitor(node: TS.Node): TS.Node {
				VisitTree.toNext(node)
				ScopeTree.toNext(node)

				VisitTree.toChild()
				ScopeTree.toChild()

				ts.visitEachChild(node, initVisitor, ctx)
				
				VisitTree.toParent()
				ScopeTree.toParent()

				// Returned result has no matter.
				return node
			}

			function visitor(node: TS.Node): TS.Node {
				let doMoreAfterVisitedChildren = applyVisitors(node)
				ts.visitEachChild(node, visitor, ctx)
				doMoreAfterVisitedChildren()

				// Returned result has no matter.
				return node
			}

			try {
				ts.visitNode(sourceFile, initVisitor)
				ts.visitNode(sourceFile, visitor)
				callVisitedSourceFileCallbacks()
				runPostVisitCallbacks()

				return Interpolator.outputSelf(0) as TS.SourceFile
			}
			catch (err) {
				console.warn(`Failed to transform source file "${sourceFile.fileName}"!`)
				throw err
			}
		}
	}
}
