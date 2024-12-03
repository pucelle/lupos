import * as ts from 'typescript'
import {VisitTree} from './visit-tree'
import {VariableScope} from './scope'
import {Packer} from './packer'
import {factory, helper, transformContext} from './global'
import {addToList} from '../utils'
import {VariableScopeTree} from './scope-tree'


export interface HashItem {

	/** Unique name. */
	name: string

	/** The variable declaration scopes that current node used. */
	usedScopes: VariableScope[]

	/** The variable declaration nodes that current node used. */
	usedDeclarations: ts.Node[]
}


export namespace Hashing {

	/** Visit node -> node hash result. */
	const HashMap: Map<ts.Node, HashItem> = new Map()

	/** 
	 * Get hash of raw node.
	 * Note hashing will transform `a?.b` -> `a.b`.
	 */
	export function hashNode(rawNode: ts.Node): HashItem {
		if (HashMap.has(rawNode)) {
			return HashMap.get(rawNode)!
		}

		let hashed = doHashing(rawNode)
		HashMap.set(rawNode, hashed)

		return hashed
	}

	/** Hash a node, normalize and add a unique suffix to all variable nodes. */
	function doHashing(rawNode: ts.Node): HashItem {
		let usedScopes: VariableScope[] = []
		let usedDeclarations: ts.Node[] = []
		let node = rawNode

		let hashVisited = ts.visitNode(node, (n: ts.Node) => {
			return hashNodeVisitor(n, usedScopes, usedDeclarations)
		})!

		node = Packer.normalize(hashVisited, true)

		return {
			name: helper.getFullText(node),
			usedScopes,
			usedDeclarations: usedDeclarations,
		}
	}

	function hashNodeVisitor(node: ts.Node, usedScopes: VariableScope[], usedDeclarations: ts.Node[]): ts.Node | undefined {

		// Not raw node.
		if (!VisitTree.hasNode(node)) {}

		// a -> a_123
		else if (helper.isVariableIdentifier(node)) {
			let {name, scope} = hashVariableName(node)
			let declNode = scope.getVariableDeclaredOrReferenced(node.text)

			addToList(usedScopes, scope)

			if (declNode) {
				usedDeclarations.push(declNode)
			}

			return factory.createIdentifier(name)
		}

		// this -> this_123
		else if (helper.isThis(node)) {
			let {name, scope} = hashVariableName(node as ts.ThisExpression)
			addToList(usedScopes, scope)

			return factory.createIdentifier(name)
		}

		// `a?.b` -> `a.b`
		else if (node.kind === ts.SyntaxKind.QuestionDotToken) {
			return undefined
		}

		return ts.visitEachChild(node, (n: ts.Node) => hashNodeVisitor(n, usedScopes, usedDeclarations), transformContext)
	}

	/** 
	 * Hash a node by replace variable name or `this` to add a suffix.
	 * The suffix is normally a scope visit index,
	 * then the hashing is unique across whole source file.
	 */
	function hashVariableName(rawNode: ts.Identifier | ts.ThisExpression): {name: string, scope: VariableScope} {
		let scope = VariableScopeTree.findDeclared(rawNode) || VariableScopeTree.findClosest(rawNode)
		let name = helper.getFullText(rawNode)
		let suffix = VisitTree.getIndex(scope.node)

		return {
			name: name + '_' + suffix,
			scope,
		}
	}
}
