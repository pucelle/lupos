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

			function visit(node: ts.Node): ts.Node | undefined {
				node = applyVisitors(node, helper, modifier)!
				return ts.visitEachChild(node, visit, ctx)
			}

			function visitSourceFile(node: ts.SourceFile): ts.SourceFile | undefined {
				node = ts.visitEachChild(node, visit, ctx)
				return modifier.output(node)
			}

			return ts.visitNode(sourceFile, visitSourceFile)
		}
	}
}