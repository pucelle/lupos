import type * as ts from 'typescript'
import type {TransformerExtras, PluginConfig} from 'ts-patch'
import {SourceFileModifier, TSHelper, applyVisitors} from './base'
import './lupos.js'
import {ObservedChecker} from './observable/checker'
import {ContextualNode, isContextualNode, popMayObservedClass, popObservedContext, pushMayObservedClass, pushObservedContext} from './ff'


export default function(program: ts.Program, _pluginConfig: PluginConfig, extras: TransformerExtras) {
	let {ts} = extras

	return (ctx: ts.TransformationContext) => {
		let helper = new TSHelper(program, ts)
		let observedChecker = new ObservedChecker(helper)

		return (sourceFile: ts.SourceFile) => {
			let modifier = new SourceFileModifier(helper, ctx)

			function visit(node: ts.Node): ts.Node | ts.Node[] {

				// Check whether in the range of an observed class.
				let beClass = ts.isClassDeclaration(node)
				if (beClass) {
					pushMayObservedClass(node as ts.ClassDeclaration, helper)
				}

				// Check contextual state, must after observable state pushing.
				let beContextualNode = isContextualNode(node, helper)
				if (beContextualNode) {
					pushObservedContext(node as ContextualNode, observedChecker)
				}

				let nodes = applyVisitors(node, helper, modifier)!
				nodes = nodes.map(n => ts.visitEachChild(n, visit, ctx))

				if (beContextualNode) {
					popObservedContext()
				}

				if (beClass) {
					popMayObservedClass()
				}

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
