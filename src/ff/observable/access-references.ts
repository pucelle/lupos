import {AccessNode, factory, helper, InterpolationContentType, interpolator, modifier, transformContext, ts, visiting} from '../../base'
import type TS from 'typescript'
import {ContextTargetPosition, ContextTree} from './context-tree'
import {Context} from './context'
import {ListMap} from '../../utils'


/** 
 * It helps to remember all references,
 * and replace an access node to reference if needed.
 */
export namespace AccessReferences {

	/** 
	 * The referenced expressions like `a`, `a.b` of `a.b.c`,
	 * and the mapped visiting index of `a.b.c`.
	 */
	let referenceMap: ListMap<string, number> = new ListMap()

	/** 
	 * Remember visiting indices that have been visited.
	 * 
	 * E.g., for access node `a.b.c`,
	 * Will visit `a.b.c`, and make reference item `a` -> index of `a.b`.
	 * Later will visit `a.b` and make reference item `a` -> index of `a`.
	 * If we assign to `a`, both `a.b` and `a` will be referenced.
	 * 
	 * By avoid visiting a node twice, will only reference `a`.
	 */
	let visitedNodes: Set<TS.Node> = new Set()

	/** If access as `a.b`, and later assign `a`, then `a` of `a.b` become mutable. */
	let mutableIndices: Set<number> = new Set()

	/** Indices where access nodes have been referenced. */
	let referencedAccessIndices: Set<number> = new Set()


	/** Initialize after enter a new source file. */
	export function initialize() {
		referenceMap.clear()
		visitedNodes.clear()
		mutableIndices.clear()
	}

	/** Visit an assess node, and it may make several reference items. */
	export function visitAssess(node: AccessNode, context: Context) {
		let expIndex = visiting.getIndex(node.expression)!
		let nameNode = helper.access.getNameNode(node)
		let nameIndex = visiting.getIndex(nameNode)

		visitAccessChildren(node.expression, expIndex, context)
		visitAccessChildren(nameNode, nameIndex, context)
	}

	/** 
	 * Visit all descendant nodes of an access node,
	 * and build a map of all the referenced variables/accessing, to current node.
	 * Later, when one of these nodes assigned, we will reference this access node.
	 */
	function visitAccessChildren(node: TS.Node, topIndex: number, context: Context): TS.Node {
		if (visitedNodes.has(node)) {
			return node
		}

		visitedNodes.add(node)

		// `a?.b` has been replaced to `a.b`
		if (helper.access.isAccess(node) || helper.variable.isVariableIdentifier(node)) {
			let hash = helper.getText(context.variables.hashNode(node))
			referenceMap.add(hash, topIndex)
		}

		return ts.visitEachChild(node, (n: TS.Node) => visitAccessChildren(n, topIndex, context), transformContext)
	}


	/** 
	 * Visit assess node part of an assignment, and it may make several mutable items.
	 * It supports simply `a.b = ...` or `a = ...`, not `(a || b).c = ...`
	 * Otherwise, `a.b; a = ...; a.b;`, only the first `a` will be referenced.
	 */
	export function visitAssignment(node: TS.Expression, context: Context) {
		node = context.variables.hashNode(node)

		if (helper.access.isAccess(node) || helper.variable.isVariableIdentifier(node)) {
			let indices = referenceMap.get(helper.getText(node))
			if (indices) {
				for (let index of indices) {
					mutableIndices.add(index)
				}
			}
		}
	}


	/** Visit an assess node, and determine whether reference it. */
	export function mayReferenceAccess(index: number, context: Context) {
		if (referencedAccessIndices.has(index)) {
			return
		}

		let node = visiting.getNode(index) as AccessNode
		let position: ContextTargetPosition | null = null
		let expIndex = visiting.getIndex(node.expression)!
		let nameNode = helper.access.getNameNode(node)
		let nameIndex = visiting.getIndex(nameNode)

		// Use a reference variable to replace expression.
		if (shouldReference(node.expression) || mutableIndices.has(expIndex)) {
			position = reference(expIndex, context)
		}

		// Use a reference variable to replace name.
		if (shouldReference(nameNode) || mutableIndices.has(nameIndex)) {
			position = reference(nameIndex, context) || position
		}

		if (position) {
			referencedAccessIndices.add(index)
		}
	}
	

	/** 
	 * Whether be a complex expression, and should be reference.
	 * `a().b` -> `var _ref_; ...; _ref_ = a(); _ref_.b`
	 * or `a[i++]` -> `var _ref; ... ; _ref_ = i++; a[_ref]`
	 */
	function shouldReference(node: TS.Expression): boolean {

		// `a && b`, `a || b`, `a ?? b`, `a + b`, `a, b`.
		if (ts.isBinaryExpression(node)) {
			return true
		}

		// `a++`, `++a`.
		if (ts.isPostfixUnaryExpression(node) || ts.isPrefixUnaryExpression(node)) {
			return true
		}

		// `(...)`
		else if (ts.isParenthesizedExpression(node)) {
			return shouldReference(node.expression)
		}

		// `(a as Observed<{b: number}>).b`
		else if (ts.isAsExpression(node)) {
			return shouldReference(node.expression)
		}

		// `a ? b : c`
		else if (ts.isConditionalExpression(node)) {
			return true
		}

		// `a.b()`
		else if (ts.isCallExpression(node)) {
			return true
		}

		else {
			return false
		}
	}


	/** 
	 * Reference a complex expression to become a reference variable.
	 * 
	 * e.g.:
	 * 	   `a.b().c`-> `_ref_ = a.b(); ... _ref_`
	 *     `a[b++]` -> `_ref_ = b++; ... a[_ref_]`
	 * 
	 * Return reference position.
	 */
	function reference(index: number, context: Context): ContextTargetPosition {
		let varPosition = ContextTree.findClosestPositionToAddVariable(index, context)
		let refName = varPosition.context.variables.makeUniqueVariable('_ref_')

		// Insert one: `var ... _ref_ = ...`
		if (ts.isVariableDeclaration(visiting.getNode(varPosition.index))) {
			
			// insert `var _ref_ = a.b()` to found position.
			modifier.addVariableAssignmentToList(index, varPosition.index, refName)

			// replace `a.b()` -> `_ref_`.
			interpolator.replace(index, InterpolationContentType.Reference, () => factory.createIdentifier(refName))

			return varPosition
		}

		// Insert two: `var _ref_`, and `_ref_ = ...`
		else {
			varPosition.context.capturer.addUniqueVariable(refName)

			let refPosition = ContextTree.findClosestPositionToAddStatement(index, context)

			// insert `_ref_ = a.b()` to found position.
			modifier.addReferenceAssignment(index, refPosition.index, refName)

			// replace `a.b()` -> `_ref_`.
			interpolator.replace(index, InterpolationContentType.Reference, () => factory.createIdentifier(refName))

			return refPosition
		}
	}
}