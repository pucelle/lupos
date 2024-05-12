import type * as ts from 'typescript'
import {TSHelper} from './ts-helper'
import {SourceFileModifier} from './source-file-modifier'


const Visitors: {
	match: (node: ts.Node, helper: TSHelper) => boolean,
	visit: (node: ts.Node, helper: TSHelper, modifier: SourceFileModifier) => ts.Node | ts.Node[] | undefined,
}[] = []


export function defineVisitor(
	match: (node: ts.Node, helper: TSHelper) => boolean,
	visit: (node: any, helper: TSHelper, modifier: SourceFileModifier) => ts.Node | ts.Node[] | undefined
) {
	Visitors.push({match, visit})
}


export function applyVisitors(node: ts.Node | undefined, helper: TSHelper, modifier: SourceFileModifier): ts.Node[] | undefined {
	let nodes = node ? [node] : []

	for (let visitor of Visitors) {
		let newNodes: ts.Node[] = []
		
		for (let node of nodes) {
			if (visitor.match(node, helper)) {
				let nodeOrArray = visitor.visit(node, helper, modifier)

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