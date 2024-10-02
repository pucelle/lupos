import {AccessNode, factory, Helper, InterpolationContentType, Interpolator, Modifier, transformContext, ts, VisitTree, ScopeTree} from '../../base'
import type TS from 'typescript'
import {ContextTree} from './context-tree'
import {Context} from './context'
import {ListMap} from '../../utils'


/** 
 * It helps to remember all references,
 * and replace an access node to reference if needed.
 */
export namespace AccessReferences {

	/** 
	 * The referenced expressions like `a`, `a.b` of `a.b.c`,
	 * and the mapped visit index of original expression `a.b.c`.
	 */
	const referenceMap: ListMap<string, number> = new ListMap()

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
	const visitedNodes: Set<TS.Node> = new Set()

	/** 
	 * If access as `a.b`, and later assign `a`, then node `a` of `a.b` become mutable.
	 * Mutable visiting index -> Assignment visiting index.
	 */
	const mutableIndices: Map<number, number> = new Map()

	/** Indices where access nodes have been referenced. */
	const referencedAccessIndices: Set<number> = new Set()

	/** Node visiting indices that have tested reference. */
	const referencedTested: Set<number> = new Set()


	/** Initialize after enter a new source file. */
	export function init() {
		referenceMap.clear()
		visitedNodes.clear()
		mutableIndices.clear()
		referencedAccessIndices.clear()
		referencedTested.clear()
	}


	/** Whether any descendant access node has been referenced. */
	export function isDescendantAccessReferenced(index: number): boolean {
		if (referencedAccessIndices.has(index)) {
			return true
		}

		let childIndices = VisitTree.getChildIndices(index)
		if (!childIndices) {
			return false
		}

		return childIndices.some(i => isDescendantAccessReferenced(i))
	}


	/** Visit an assess node, and it may make several reference items. */
	export function visitAssess(node: AccessNode) {
		let expIndex = VisitTree.getIndex(node.expression)!
		let nameNode = Helper.access.getNameNode(node)
		let nameIndex = VisitTree.getIndex(nameNode)

		visitAssessVisitor(node.expression, expIndex)
		visitAssessVisitor(nameNode, nameIndex)
	}

	/** 
	 * Visit all descendant nodes of an access node,
	 * and build a map of all the referenced variables/accessing, to current node.
	 * Later, when one of these nodes assigned, we will reference this access node.
	 */
	function visitAssessVisitor(node: TS.Node, topIndex: number): TS.Node {
		if (visitedNodes.has(node)) {
			return node
		}

		visitedNodes.add(node)

		// `a?.b` has been replaced to `a.b`
		if (Helper.access.isAccess(node) || Helper.variable.isVariableIdentifier(node)) {
			let hashName = ScopeTree.hashNode(node, true).name
			referenceMap.add(hashName, topIndex)
		}

		return ts.visitEachChild(node, (n: TS.Node) => visitAssessVisitor(n, topIndex), transformContext)
	}


	/** 
	 * Visit assess node part of an assignment, and it may make several mutable items.
	 * It supports simply `a.b = ...` or `a = ...`, not `(a || b).c = ...`
	 * Otherwise, `a.b; a = ...; a.b;`, only the first `a` will be referenced.
	 */
	export function visitAssignment(node: TS.Expression) {
		if (Helper.access.isAccess(node) || Helper.variable.isVariableIdentifier(node)) {
			let mutableIndex = VisitTree.getIndex(node)
			let hashName = ScopeTree.hashNode(node, true).name
			let refIndices = referenceMap.get(hashName)
			
			// For all the existing references before current assignment.
			if (refIndices) {
				for (let refIndex of refIndices) {
					mutableIndices.set(refIndex, mutableIndex)
				}
			}
		}
	}


	/** Visit an assess node, reference after determined should reference. */
	export function mayReferenceAccess(index: number, toIndex: number, context: Context) {
		let node = VisitTree.getNode(index)
		if (!Helper.access.isAccess(node)) {
			return
		}

		// Avoid after tested, move to outer and test again.
		if (referencedTested.has(index)) {
			return
		}

		let expIndex = VisitTree.getIndex(node.expression)!
		let nameNode = Helper.access.getNameNode(node)
		let nameIndex = VisitTree.getIndex(nameNode)
		let referenced = false

		// Use a reference variable to replace expression.
		if (shouldReference(expIndex, toIndex)) {
			reference(expIndex, context)
			referenced = true
		}

		// Use a reference variable to replace name.
		if (shouldReference(nameIndex, toIndex)) {
			reference(nameIndex, context)
			referenced = true
		}

		if (referenced) {
			referencedAccessIndices.add(index)
		}

		referencedTested.add(index)
	}


	/** 
	 * After an node visiting has been marked as mutable,
	 * and before output it's tracking codes,
	 * test whether it should output as mutable.
	 */
	function shouldReference(index: number, toIndex: number): boolean {
		let node = VisitTree.getNode(index)
		if (shouldReferenceComplex(node)) {
			return true
		}

		if (!mutableIndices.has(index)) {
			return false
		}

		// Mutable when output after assignment
		let assignmentIndex = mutableIndices.get(index)!
		return VisitTree.isPrecedingOfInChildFirstOrder(assignmentIndex, toIndex)
	}
	

	/** 
	 * Whether be a complex expression like binary, and should be referenced.
	 * `a().b` -> `var $ref_; ...; $ref_ = a(); $ref_.b`
	 * or `a[i++]` -> `var _ref; ... ; $ref_ = i++; a[_ref]`
	 */
	function shouldReferenceComplex(node: TS.Node): boolean {

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
			return shouldReferenceComplex(node.expression)
		}

		// `(a as Observed<{b: number}>).b`
		else if (ts.isAsExpression(node)) {
			return shouldReferenceComplex(node.expression)
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
	 * 	   `a.b().c`-> `$ref_ = a.b(); ... $ref_`
	 *     `a[b++]` -> `$ref_ = b++; ... a[$ref_]`
	 */
	function reference(index: number, context: Context) {
		let varDeclListIndex = VisitTree.findOutwardMatch(index, context.visitIndex, ts.isVariableDeclaration)
		let varScope = ScopeTree.findClosest(index)
		let refName = varScope.makeUniqueVariable('$ref_')

		// Insert one variable declaration to existing declaration list: `var ... $ref_ = ...`
		if (varDeclListIndex !== undefined) {
			
			// insert `var $ref_ = a.b()` to found position.
			Modifier.addVariableAssignmentToList(index, varDeclListIndex, refName)

			// replace `a.b()` -> `$ref_`.
			Interpolator.replace(index, InterpolationContentType.Reference, () => factory.createIdentifier(refName))
		}

		// Insert two: `var $ref_`, and `$ref_ = ...`
		else {
			varScope.addVariable(refName)

			let refPosition = ContextTree.findClosestPositionToAddStatements(index, context)
	
			// insert `$ref_ = a.b()` to found position.
			Modifier.addReferenceAssignment(index, refPosition.index, refName)

			// replace `a.b()` -> `$ref_`.
			Interpolator.replace(index, InterpolationContentType.Reference, () => factory.createIdentifier(refName))
		}
	}
}