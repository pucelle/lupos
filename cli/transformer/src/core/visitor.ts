import ts from 'typescript'
import {Interpolator} from './interpolator'
import {createTransformSession, setTransformContext} from './global'
import {runPostVisitCallbacks, runPreVisitCallbacks} from './visitor-callbacks'
import {runSourceFilePrepass} from './source-file-prepass'
import {TransformerExtras} from '../../../compiler/out/patch'


/** 
 * It accepts a node,
 * can either return a function, which will be called after visited all children,
 * or return void to do nothing more.
 */
type VisitFunction<T extends ts.Node = any> = (node: T) => (() => void) | void

interface VisitorRegistration {
	visitor: VisitFunction
	order: number
}


/** Visitors that must inspect every node. */
const GenericVisitors: VisitorRegistration[] = []

/** Visitors indexed by the only node kinds they can handle. */
const VisitorsByKind: Map<ts.SyntaxKind, VisitorRegistration[]> = new Map()

let visitorOrder: number = 0


/** 
 * Define a visitor, and push it to visitor list.
 * `visit` will visit each node in depth-first order,
 * so you don't need to visit child nodes in each defined visitor.
 */
export function defineVisitor(visitor: VisitFunction): void
export function defineVisitor(kinds: ts.SyntaxKind | readonly ts.SyntaxKind[], visitor: VisitFunction): void
export function defineVisitor(
	kindsOrVisitor: ts.SyntaxKind | readonly ts.SyntaxKind[] | VisitFunction,
	visitor?: VisitFunction
) {
	let registration: VisitorRegistration = {
		visitor: visitor ?? kindsOrVisitor as VisitFunction,
		order: visitorOrder++,
	}

	if (typeof kindsOrVisitor === 'function') {
		GenericVisitors.push(registration)
		return
	}

	let kinds = Array.isArray(kindsOrVisitor) ? kindsOrVisitor : [kindsOrVisitor]
	for (let kind of kinds) {
		let visitors = VisitorsByKind.get(kind)
		if (!visitors) {
			visitors = []
			VisitorsByKind.set(kind, visitors)
		}

		visitors.push(registration)
	}
}


/** 
 * Apply defined visitors to a node.
 * Returns a function, which will be called after visited all children.
 */
function applyVisitors(node: ts.Node): () => void {
	let doMoreAfterVisitedChildren: (() => void)[] = []
	let kindVisitors = VisitorsByKind.get(node.kind) ?? []
	let genericIndex = 0
	let kindIndex = 0

	// Both lists are registration ordered; merge them to preserve the original
	// visitor order without invoking visitors registered for unrelated kinds.
	while (genericIndex < GenericVisitors.length || kindIndex < kindVisitors.length) {
		let generic = GenericVisitors[genericIndex]
		let specific = kindVisitors[kindIndex]
		let registration: VisitorRegistration

		if (!specific || generic && generic.order < specific.order) {
			registration = GenericVisitors[genericIndex++]
		}
		else {
			registration = kindVisitors[kindIndex++]
		}

		let more = registration.visitor(node)
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


/** Transformer entry, it will be call for each transformer. */
export function transformer(context: ts.TransformationContext, extras: TransformerExtras): ts.Transformer<ts.SourceFile> {
	setTransformContext(context, extras)

	return (sourceFile: ts.SourceFile) => {
		let session = createTransformSession(sourceFile)

		// Before visiting a source file.
		runPreVisitCallbacks()

		// Pre pass the source file for initializing some scope tree and visit tree.
		runSourceFilePrepass(sourceFile)

		function visitor(node: ts.Node): ts.Node {
			let doMoreAfterVisitedChildren = applyVisitors(node)
			ts.visitEachChild(node, visitor, context)
			doMoreAfterVisitedChildren()

			return node
		}

		// Now handle compiling.
		try {
			ts.visitNode(sourceFile, visitor)
			session.callJustVisitedCallbacks()
			runPostVisitCallbacks()

			return Interpolator.outputSelf(sourceFile) as ts.SourceFile
		}
		catch (err) {
			console.warn(`Failed to transform source file "${sourceFile.fileName}"!`)
			throw err
		}
	}
}
