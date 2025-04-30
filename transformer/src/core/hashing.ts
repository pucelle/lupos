import * as ts from 'typescript'
import {VisitTree} from './visit-tree'
import {DeclarationScope} from './scope'
import {Packer} from './packer'
import {factory, helper, transformContext} from './global'
import {addToList} from '../utils'
import {DeclarationScopeTree} from './scope-tree'


export interface HashItem {

	/** Unique name. */
	name: string

	/** The variable declaration scopes that current node used. */
	usedScopes: DeclarationScope[]

	/** The variable declaration nodes that current node used. */
	usedDeclarations: ts.Node[]
}


export namespace Hashing {

	/** Visit node -> node hash result. */
	const HashMap: Map<ts.Node, HashItem> = new Map()

	/** 
	 * Get hash result of raw node.
	 * Note hashing process will transform `a?.b` -> `a.b`.
	 * String will be encode to use double quotes: `'a'` -> `"a"`.
	 */
	export function hashNode(rawNode: ts.Node): HashItem {
		if (HashMap.has(rawNode)) {
			return HashMap.get(rawNode)!
		}

		let hashed = doHashing(rawNode, rawNode)
		HashMap.set(rawNode, hashed)

		return hashed
	}

	/** 
	 * Get hash result of node, `node` may be a newly created node.
	 * Note hashing process will transform `a?.b` -> `a.b`.
	 * String will be encode to use double quotes: `'a'` -> `"a"`.
	 */
	export function hashMayNewNode(node: ts.Node, closestRawNode: ts.Node): HashItem {
		if (HashMap.has(node)) {
			return HashMap.get(node)!
		}

		let hashed = doHashing(node, closestRawNode)
		HashMap.set(node, hashed)

		return hashed
	}

	/** Hash a node, normalize and add a unique suffix to all variable nodes. */
	function doHashing(node: ts.Node, closestRawNode: ts.Node): HashItem {
		let usedScopes: DeclarationScope[] = []
		let usedDeclarations: ts.Node[] = []
	
		let hashVisited = ts.visitNode(node, (n: ts.Node) => {
			return hashNodeVisitor(n, VisitTree.hasNode(n) ? n : closestRawNode, usedScopes, usedDeclarations)
		})!

		let normalized = Packer.normalize(hashVisited, true)

		return {
			name: helper.getFullText(normalized),
			usedScopes,
			usedDeclarations: usedDeclarations,
		}
	}

	function hashNodeVisitor(node: ts.Node, closestRawNode: ts.Node, usedScopes: DeclarationScope[], usedDeclarations: ts.Node[]): ts.Node | undefined {

		// a -> a_123
		if (helper.isVariableIdentifier(node)) {
			let {name, scope} = hashVariableName(node, closestRawNode)
			let declNode = scope.getVariableDeclaredOrReferenced(node.text)

			addToList(usedScopes, scope)

			if (declNode) {
				usedDeclarations.push(declNode)
			}

			return factory.createIdentifier(name)
		}

		// this -> this_123
		else if (helper.isThis(node)) {
			let {name, scope} = hashVariableName(node as ts.ThisExpression, closestRawNode)
			addToList(usedScopes, scope)

			return factory.createIdentifier(name)
		}

		// `a?.b` -> `a.b`
		else if (node.kind === ts.SyntaxKind.QuestionDotToken) {
			return undefined
		}

		return ts.visitEachChild(
			node,
			(n: ts.Node) => hashNodeVisitor(n, VisitTree.hasNode(n) ? n : closestRawNode, usedScopes, usedDeclarations),
			transformContext
		)
	}

	/** 
	 * Hash a node by replace variable name or `this` to add a suffix.
	 * The suffix is normally a scope visit index,
	 * then the hashing is unique across whole source file.
	 */
	function hashVariableName(node: ts.Identifier | ts.ThisExpression, closestRawNode: ts.Node): {name: string, scope: DeclarationScope} {
		let closest = DeclarationScopeTree.findClosest(closestRawNode)
		let scope = DeclarationScopeTree.findDeclared(node, closest) || closest
		let name = helper.getFullText(node)
		let suffix = VisitTree.getIndex(scope.node)

		return {
			name: name + '_' + suffix,
			scope,
		}
	}
}
