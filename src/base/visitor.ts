import type TS from 'typescript'
import {Visiting} from './visiting'
import {Interpolator} from './interpolator'
import {TransformerExtras} from 'ts-patch'
import {setGlobal, setSourceFile, setTransformContext} from './global'
import {Modifier} from './modifier'


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
export function applyVisitors(node: TS.Node, index: number): () => void {
	let doMoreAfterVisitedChildren: Function[] = []

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

	return (ctx: TS.TransformationContext) => {
		setTransformContext(ctx)

		return (sourceFile: TS.SourceFile) => {
			setSourceFile(sourceFile)

			function visit(node: TS.Node): TS.Node {
				Visiting.toNext(node)

				let doMoreAfterVisitedChildren = applyVisitors(node, Visiting.current.index)

				Visiting.toChild()
				ts.visitEachChild(node, visit, ctx)
				Visiting.toParent()

				doMoreAfterVisitedChildren()

				// Returned result has no matter.
				return node
			}

			try {
				ts.visitNode(sourceFile, visit)
				Modifier.apply()
				return Interpolator.output(0) as TS.SourceFile
			}
			catch (err) {
				console.log(`Failed to transform source file "${sourceFile.fileName}"!`)
				throw err
			}
		}
	}
}
