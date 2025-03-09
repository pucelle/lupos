import {factory, InterpolationContentType, Interpolator, Modifier, VisitTree, DeclarationScopeTree, helper} from '../../core'
import * as ts from 'typescript'
import {TrackingScopeTree} from './scope-tree'
import {TrackingScope} from './scope'


/** 
 * It helps to remember all references,
 * and replace an access node to reference if needed.
 */
export namespace TrackingReferences {

	/** Nodes have been referenced. */
	const ReferencedNodes: Set<ts.Node> = new Set()


	/** Initialize after enter a new source file. */
	export function init() {
		ReferencedNodes.clear()
	}


	/** Whether any descendant node has been referenced. */
	export function hasInternalReferenced(node: ts.Node): boolean {
		if (ReferencedNodes.has(node)) {
			return true
		}

		let childNodes = VisitTree.getChildNodes(node)
		if (!childNodes) {
			return false
		}

		return childNodes.some(n => hasInternalReferenced(n))
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


	/** 
	 * Reference an expression if needed.
	 * Note `expNode` may not be raw node.
	 */
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

			// Not stop, child may be raw node.
			if (!helper.isRaw(descendant)) {
				continue
			}

			if (shouldReferenceForSelf(descendant)) {
				return true
			}

			if (helper.access.isAccess(descendant) || helper.isVariableIdentifier(descendant)) {
				let assignableNode = DeclarationScopeTree.whereWillBeAssigned(descendant)
				if (!assignableNode) {
					continue
				}

				// Although it will be assigned, but has been referenced.
				if (ReferencedNodes.has(assignableNode)) {
					continue
				}

				// To reference only when output after earliest assignment.
				let outputAfterAssignment = VisitTree.isPrecedingOfInChildFirstOrder(assignableNode, toNode)
				if (outputAfterAssignment) {
					console.log(helper.getFullText(assignableNode), 2)
					return true
				}
			}
		}

		return false
	}


	/** 
	 * Whether be a complex expression like binary, and should be referenced.
	 * `a().b` -> `var $ref_; ...; $ref_ = a(); $ref_.b`
	 * or `a[i++]` -> `var _ref; ... ; $ref_ = i++; a[_ref]`
	 */
	function shouldReferenceForSelf(node: ts.Node): boolean {

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