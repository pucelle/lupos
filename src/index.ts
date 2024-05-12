import type * as ts from 'typescript'
import type {TransformerExtras, PluginConfig} from 'ts-patch'
import {SourceFileModifier, TSHelper, applyVisitors} from './base'
import './component'


export default function(program: ts.Program, _pluginConfig: PluginConfig, extras: TransformerExtras) {
	let {ts} = extras

	return (ctx: ts.TransformationContext) => {
		let helper = new TSHelper(program, ts)

		return (sourceFile: ts.SourceFile) => {
			let modifier = new SourceFileModifier(ts, ctx)

			function visit(node: ts.Node): ts.Node | ts.Node[] {
				let nodes = applyVisitors(node, helper, modifier)!

				nodes = nodes.map(node => {
					if (shouldVisitChildren(node, helper)) {
						return ts.visitEachChild(node, visit, ctx)
					}
					else {
						return node
					}
				})

				// If only one node and package it to an array, it represents a new node,
				// and types will not be eliminated even not referenced.
				return nodes.length === 1 ? nodes[0] : nodes
			}

			function visitSourceFile(node: ts.SourceFile): ts.SourceFile | undefined {
				node = ts.visitEachChild(node, visit, ctx)
				return modifier.output(node)
			}

			return ts.visitNode(sourceFile, visitSourceFile)
		}
	}
}


/** Whether should visit all children. */
export function shouldVisitChildren(node: ts.Node, helper: TSHelper) {
	return helper.ts.isModuleDeclaration(node)
		|| helper.ts.isClassDeclaration(node)
}