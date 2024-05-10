import type * as ts from 'typescript'
import {TSHelper} from './ts-helper'
import {SourceFileModifier} from './source-file-modifier'


const Visitors: {
	match: (node: ts.Node, helper: TSHelper) => boolean,
	visit: (node: ts.Node, helper: TSHelper, modifier: SourceFileModifier) => ts.Node | undefined,
}[] = []


export function defineVisitor(
	match: (node: ts.Node, helper: TSHelper) => boolean,
	visit: (node: any, helper: TSHelper, modifier: SourceFileModifier) => ts.Node | undefined
) {
	Visitors.push({match, visit})
}


export function applyVisitors(node: ts.Node | undefined, helper: TSHelper, modifier: SourceFileModifier): ts.Node | undefined {
	for (let visitor of Visitors) {
		if (node && visitor.match(node, helper)) {
			node = visitor.visit(node, helper, modifier)
		}
	}

	return node
}