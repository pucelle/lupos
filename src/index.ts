import type * as ts from 'typescript'
import type {TransformerExtras, PluginConfig} from 'ts-patch'
import {SourceFileModifier, TSHelper, applyVisitors} from './base'
import {} from './ff'
import './ff'
import './lupos.js'


export default function(program: ts.Program, _pluginConfig: PluginConfig, extras: TransformerExtras) {
	let {ts} = extras

	return (ctx: ts.TransformationContext) => {
		let helper = new TSHelper(program, ts)

		return (sourceFile: ts.SourceFile) => {
			let modifier = new SourceFileModifier(helper, ctx)

			function visit(node: ts.Node): ts.Node | ts.Node[] {
				let nodes = applyVisitors(node, modifier)!
				nodes = nodes.map(node => ts.visitEachChild(node, visit, ctx))

				// If only one node and package it to an array, it represents a new node,
				// and types will not be eliminated even not referenced.
				return nodes.length === 1 ? nodes[0] : nodes
			}

			function visitSourceFile(node: ts.SourceFile): ts.SourceFile | undefined {
				node = ts.visitNode(node, visit) as ts.SourceFile
				return modifier.output(node)
			}

			return ts.visitNode(sourceFile, visitSourceFile)
		}
	}
}
