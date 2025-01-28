import {factory, InterpolationContentType, Interpolator, Modifier, VisitTree, VariableScopeTree, helper} from '../../core'
import {AccessNode, AssignmentNode} from '../../lupos-ts-module'
import * as ts from 'typescript'
import {TrackingScopeTree} from './scope-tree'
import {TrackingScope} from './scope'
import {ObservedChecker} from './observed-checker'


/** 
 * It helps to remember all references,
 * and replace an access node to reference if needed.
 */
export namespace AccessReferences {

	/** 
	 * Remember nodes that have been visited.
	 * 
	 * E.g., for access node `a.b.c`,
	 * Will visit `a.b.c`, and make reference item `a` -> `a.b`.
	 * Later will visit `a.b` and make reference item `a` -> `a`.
	 * If we assign to `a`, both `a.b` and `a` will be referenced.
	 * 
	 * By avoid visiting a node twice, will only reference `a`.
	 */
	const VisitedNodes: Set<ts.Node> = new Set()

	/** 
	 * If access as `a.b`, and later assign `a`, then node `a` of `a.b` become mutable.
	 * Node -> Assignment node.
	 */
	const WillBeAssigned: Map<ts.Node, AssignmentNode> = new Map()

	/** Nodes at where access nodes have been referenced. */
	const ReferencedNodes: Set<ts.Node> = new Set()

	/** Nodes that have tested reference. */
	const ReferencedTested: Set<ts.Node> = new Set()


	/** Initialize after enter a new source file. */
	export function init() {
		VisitedNodes.clear()
		WillBeAssigned.clear()
		ReferencedNodes.clear()
		ReferencedTested.clear()
	}


	/** Whether any descendant access node has been referenced. */
	export function hasExternalAccessReferenced(node: ts.Node, ignoreListStructKey: boolean): boolean {
		if (ReferencedNodes.has(node)) {
			return true
		}

		if (ignoreListStructKey
			&& helper.access.isAccess(node)
			&& ObservedChecker.isListLike(node.expression)
		) {
			return hasExternalAccessReferenced(node.expression, false)
		}

		let childNodes = VisitTree.getChildNodes(node)
		if (!childNodes) {
			return false
		}

		return childNodes.some(n => hasExternalAccessReferenced(n, false))
	}


	/** Visit an assess node, and it may make several reference items. */
	export function visitAssess(node: AccessNode) {
		let expNode = node.expression
		let nameNode = helper.access.getPropertyNode(node)

		visitAssessRecursively(expNode, expNode)
		visitAssessRecursively(nameNode, nameNode)
	}

	/** 
	 * Visit all descendant nodes of an access node,
	 * and build a map of all the referenced variables/accessing, to current node.
	 * Later, when one of these nodes assigned, we will reference this access node.
	 */
	function visitAssessRecursively(node: ts.Node, topNode: ts.Node) {
		if (VisitedNodes.has(node)) {
			return
		}

		VisitedNodes.add(node)

		// `a?.b` has been replaced to `a.b`
		if (helper.access.isAccess(node) || helper.isVariableIdentifier(node)) {
			let assignmentNode = VariableScopeTree.whereWillBeAssigned(node)
			if (assignmentNode !== undefined) {
				WillBeAssigned.set(topNode, assignmentNode)
			}
		}

		ts.forEachChild(node, (n: ts.Node) => visitAssessRecursively(n, topNode))
	}


	/** Visit an assess node, reference after determined should reference. */
	export function mayReferenceAccess(node: ts.Node, toNode: ts.Node, scope: TrackingScope) {
		if (!helper.access.isAccess(node)) {
			return
		}

		// Avoid after tested, move to outer and test again.
		if (ReferencedTested.has(node)) {
			return
		}

		let expNode = node.expression
		let nameNode = helper.access.getPropertyNode(node)

		// Use a reference variable to replace expression.
		if (shouldReference(expNode, toNode)) {
			reference(expNode, scope)
			ReferencedNodes.add(expNode)
		}

		// Use a reference variable to replace name.
		if (shouldReference(nameNode, toNode)) {
			reference(nameNode, scope)
			ReferencedNodes.add(nameNode)
		}

		ReferencedTested.add(node)
	}


	/** 
	 * After an node visiting has been marked as mutable,
	 * and before output it's tracking codes,
	 * test whether it should output as mutable.
	 */
	function shouldReference(node: ts.Node, toNode: ts.Node): boolean {
		if (shouldReferenceInternal(node)) {
			return true
		}

		if (!WillBeAssigned.has(node)) {
			return false
		}

		// Mutable when output after assignment
		let assignmentNode = WillBeAssigned.get(node)!
		return VisitTree.isPrecedingOfInChildFirstOrder(assignmentNode, toNode)
	}
	

	/** 
	 * Whether be a complex expression like binary, and should be referenced.
	 * `a().b` -> `var $ref_; ...; $ref_ = a(); $ref_.b`
	 * or `a[i++]` -> `var _ref; ... ; $ref_ = i++; a[_ref]`
	 */
	function shouldReferenceInternal(node: ts.Node): boolean {

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
			return shouldReferenceInternal(node.expression)
		}

		// `(a as Observed<{b: number}>).b`
		else if (ts.isAsExpression(node)) {
			return shouldReferenceInternal(node.expression)
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
	 * 	   `a.b().c`-> `$ref_0 = a.b(); ... $ref_`
	 *     `a[b++]` -> `$ref_0 = b++; ... a[$ref_0]`
	 */
	function reference(node: ts.Node, scope: TrackingScope) {
		let varDeclListNode = helper.findOutwardUntil(node, scope.node, ts.isVariableDeclaration)
		let varScope = VariableScopeTree.findClosest(node).findClosestToAddStatements()
		let refName = varScope.makeUniqueVariable('$ref_')

		// Insert one variable declaration to existing declaration list: `var ... $ref_0 = ...`
		if (varDeclListNode !== undefined) {
			
			// insert `var $ref_0 = a.b()` to found position.
			Modifier.addVariableAssignmentToList(node, varDeclListNode, refName)

			// replace `a.b()` -> `$ref_0`.
			Interpolator.replace(node, InterpolationContentType.Reference, () => factory.createIdentifier(refName))
		}

		// Insert two: `var $ref_0`, and `$ref_0 = ...`
		else {
			
			let refPosition = TrackingScopeTree.findClosestPositionToAddStatements(node, scope)
			let declAssignTogether = varScope.node === refPosition.scope.node

			if (declAssignTogether) {

				// insert `let $ref_0 = a.b()` to found position.
				Modifier.addVariableAssignment(node, refPosition.node, refName)
			}
			else {
				// let $ref_0 
				varScope.addVariable(refName)
				
				// insert `$ref_0 = a.b()` to found position.
				Modifier.addReferenceAssignment(node, refPosition.node, refName)
			}

			// replace `a.b()` -> `$ref_0`.
			Interpolator.replace(node, InterpolationContentType.Reference, () => factory.createIdentifier(refName))
		}
	}
}