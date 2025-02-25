import {factory, InterpolationContentType, Interpolator, Modifier, VisitTree, DeclarationScopeTree, helper} from '../../core'
import {AccessNode, AssignmentNode} from '../../lupos-ts-module'
import * as ts from 'typescript'
import {TrackingScopeTree} from './scope-tree'
import {TrackingScope} from './scope'


/** 
 * It helps to remember all references,
 * and replace an access node to reference if needed.
 */
export namespace TrackingReferences {

	/** 
	 * Remember nodes that have been visited.
	 * 
	 * E.g., for accessing node `a.b.c`,
	 * Will visit `a.b.c`, and make reference item `a` -> `a.b`.
	 * Later will visit `a.b` and make reference item `a` -> `a`.
	 * If we assign to `a`, both `a.b` and `a` will be referenced.
	 * 
	 * By avoid visiting a node twice, will only reference `a`.
	 */
	const VisitedNodes: Set<ts.Node> = new Set()

	/** 
	 * If access as `a.b`, and later assign `a`, then node `a` of `a.b` become assignable.
	 * Node -> Assignment node.
	 */
	const WillBeAssignedNodes: Map<ts.Node, AssignmentNode> = new Map()

	/** Nodes have been referenced. */
	const ReferencedNodes: Set<ts.Node> = new Set()


	/** Initialize after enter a new source file. */
	export function init() {
		VisitedNodes.clear()
		WillBeAssignedNodes.clear()
		ReferencedNodes.clear()
	}


	/** Whether any descendant node has been referenced. */
	export function hasInternalReferenced(node: ts.Node, ignoreElementsKey: boolean = true): boolean {
		if (ReferencedNodes.has(node)) {
			return true
		}

		// Ignores checking key part, only check expression part.
		// This make `a[key]` only make the reference `a`, ignores `key`.
		if (ignoreElementsKey
			&& helper.access.isAccess(node)
			&& helper.access.isExpOfElementsAccess(node.expression)
		) {
			return hasInternalReferenced(node.expression, false)
		}

		let childNodes = VisitTree.getChildNodes(node)
		if (!childNodes) {
			return false
		}

		return childNodes.some(n => hasInternalReferenced(n, false))
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
			let assignmentNode = DeclarationScopeTree.whereWillBeAssigned(node)
			if (assignmentNode !== undefined) {
				WillBeAssignedNodes.set(topNode, assignmentNode)
			}
		}

		ts.forEachChild(node, (n: ts.Node) => visitAssessRecursively(n, topNode))
	}


	/** Reference exp and name part of an access node if needed. */
	export function mayReferenceAccess(accessNode: ts.Expression, toNode: ts.Node, scope: TrackingScope) {
		if (!helper.access.isAccess(accessNode)) {
			return
		}

		let expNode = accessNode.expression
		let nameNode = helper.access.getPropertyNode(accessNode)

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
	}


	/** Reference an expression if needed. */
	export function mayReferenceExp(expNode: ts.Expression, toNode: ts.Node, scope: TrackingScope) {

		// Use a reference variable to replace expression.
		if (shouldReference(expNode, toNode)) {
			reference(expNode, scope)
			ReferencedNodes.add(expNode)
		}
	}


	/** 
	 * After an node or any descendant nodes has been marked as will be assigned,
	 * and the output statement in the following of assignment statement,
	 */
	function shouldReference(node: ts.Node, toNode: ts.Node): boolean {
		if (ReferencedNodes.has(node)) {
			return false
		}

		for (let descendant of helper.walkInward(node)) {
			if (ReferencedNodes.has(descendant)) {
				continue
			}

			if (shouldReferenceOfSelf(descendant)) {
				return true
			}

			let assignableNode = WillBeAssignedNodes.get(descendant)
			if (!assignableNode) {
				continue
			}

			// To reference only when output after assignment.
			let outputAfterAssignment = VisitTree.isPrecedingOfInChildFirstOrder(assignableNode, toNode)
			if (outputAfterAssignment) {
				return true
			}
		}

		return false
	}


	/** 
	 * Whether be a complex expression like binary, and should be referenced.
	 * `a().b` -> `var $ref_; ...; $ref_ = a(); $ref_.b`
	 * or `a[i++]` -> `var _ref; ... ; $ref_ = i++; a[_ref]`
	 */
	function shouldReferenceOfSelf(node: ts.Node): boolean {

		// `a && b`, `a || b`, `a ?? b`, `a + b`, `a, b`.
		if (ts.isBinaryExpression(node)) {
			return true
		}

		// `a++`, `++a`.
		if (ts.isPostfixUnaryExpression(node) || ts.isPrefixUnaryExpression(node)) {
			return true
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
		let varScope = DeclarationScopeTree.findClosest(node).findClosestToAddStatements()
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

			if (!DeclarationScopeTree.canSafelyMoveBeforeNode(node, refPosition.toNode)) {

				// let $ref_0 
				varScope.addVariable(refName)
				
				// Replace `$ref_0 = a.b()` to original position.
				Modifier.replaceReferenceAssignment(node, refName)
			}
			else if (declAssignTogether) {

				// Insert `let $ref_0 = a.b()` to found position.
				Modifier.addVariableAssignment(node, refPosition.toNode, refName)

				// replace `a.b()` -> `$ref_0`.
				Interpolator.replace(node, InterpolationContentType.Reference, () => factory.createIdentifier(refName))
			}
			else {
				// let $ref_0 
				varScope.addVariable(refName)
				
				// Insert `$ref_0 = a.b()` to found position.
				Modifier.addReferenceAssignment(node, refPosition.toNode, refName)

				// replace `a.b()` -> `$ref_0`.
				Interpolator.replace(node, InterpolationContentType.Reference, () => factory.createIdentifier(refName))
			}
		}
	}
}