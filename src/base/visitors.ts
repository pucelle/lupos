import type * as ts from 'typescript'
import {TSHelper} from './ts-helper'
import {SourceFileModifier} from './source-file-modifier'


const Visitors: {
	match: (node: ts.Node, helper: TSHelper) => boolean,
	visit: (node: ts.Node, modifier: SourceFileModifier) => ts.Node | ts.Node[] | undefined,
}[] = []


/** Define a visitor, and push it to visitor list. */
export function defineVisitor(
	match: (node: ts.Node, helper: TSHelper) => boolean,
	visit: (node: any, modifier: SourceFileModifier) => ts.Node | ts.Node[] | undefined
) {
	Visitors.push({match, visit})
}


/** Apply defined visitors to node. */
export function applyVisitors(node: ts.Node | undefined, modifier: SourceFileModifier): ts.Node[] | undefined {
	let nodes = node ? [node] : []

	for (let visitor of Visitors) {
		let newNodes: ts.Node[] = []
		
		for (let node of nodes) {
			if (visitor.match(node, modifier.helper)) {
				let nodeOrArray = visitor.visit(node, modifier)

				if (Array.isArray(nodeOrArray)) {
					newNodes.push(...nodeOrArray)
				}
				else if (nodeOrArray) {
					newNodes.push(nodeOrArray)
				}
			}
			else {
				newNodes.push(node)
			}
		}

		nodes = newNodes
	}

	return nodes
}