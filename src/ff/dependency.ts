import type * as ts from 'typescript'
import {SourceFileModifier, TSHelper, defineVisitor} from '../base'
import {PropertyAccessingNode, addGetExpression} from './observable'


/**
 * Examine all property accessing expressions,
 * and add dependencies tracking codes besides.
 */
defineVisitor(

	(node: ts.Node, helper: TSHelper) => {
		return helper.ts.isPropertyAccessExpression(node)
			|| helper.ts.isElementAccessExpression(node)
	},
	(node: PropertyAccessingNode, _modifier: SourceFileModifier) => {
		addGetExpression(node)
		return node
	},
)
