import type TS from 'typescript'
import {helper, transformContext, ts, visiting} from '../../base'
import {factory} from 'typescript'
import {Context} from './context'
import {addToList} from '../../utils'


interface HashItem {
	name: string

	/** The context visiting indices each variable registered at. */
	referenceIndices: number[]
}


export namespace Hashing {

	/** Visiting index -> node hash result. */
	const hashMap: Map<number, HashItem> = new Map()


	/** 
	 * Get hash of node at the specified visiting index.
	 * Note hashing will transform `a?.b` -> `a.b`.
	 */
	export function getHash(index: number, context: Context): HashItem {
		if (hashMap.has(index)) {
			return hashMap.get(index)!
		}

		let hashed = hashNode(visiting.getNode(index), context)
		hashMap.set(index, hashed)

		return hashed
	}


	/** 
	 * Hash a node, normalize and add a unique suffix to all variable nodes.
	 * `maximumReferencedIndex` means: if you want to move this node,
	 * it can't be moved before node with visiting index >= this value. 
	 */
	function hashNode<T extends TS.Node>(node: T, context: Context): HashItem {
		let referenceIndices: number[] = []

		node = helper.pack.normalize(
			ts.visitNode(node, (n: TS.Node) => {
				return hashVisitNode(n, context, referenceIndices)
			})!,
			true
		) as T

		return {
			name: helper.getText(node),
			referenceIndices,
		}
	}

	function hashVisitNode(node: TS.Node, context: Context, referenceIndices: number[]): TS.Node | undefined {
		if (helper.variable.isVariableIdentifier(node)) {
			let hashed = context.variables.hashVariableName(node.text)
			addToList(referenceIndices, hashed.suffix)

			return factory.createIdentifier(hashed.name)
		}

		// `a?.b` -> `a.b`
		else if (node.kind === ts.SyntaxKind.QuestionDotToken) {
			return undefined
		}

		return ts.visitEachChild(node, (n: TS.Node) => hashVisitNode(n, context, referenceIndices), transformContext)
	}
}