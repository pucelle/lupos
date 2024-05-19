import type * as ts from 'typescript'
import {SourceFileModifier, TSHelper, defineVisitor} from '../base'
import {PropertyAccessingType, addGetExpressions, isAccessingObserved} from '../observable'


/**
 * Examine all property accessing expressions,
 * and add dependencies tracking codes besides.
 */
defineVisitor(

	(node: ts.Node, helper: TSHelper) => {
		return helper.ts.isPropertyAccessExpression(node)
			|| helper.ts.isElementAccessExpression(node)
	},
	(node: PropertyAccessingType, _helper: TSHelper, _modifier: SourceFileModifier) => {
		if (isAccessingObserved(node)) {
			addGetExpressions(node)
		}

		return node
	},
)
