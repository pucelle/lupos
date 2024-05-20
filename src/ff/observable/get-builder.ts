import * as ts from 'typescript'
import {PropertyAccessingNode} from './checker'
import {groupBy} from '../../utils'
import {TSHelper} from '../../base'


export namespace GetExpressionsBuilder {

	/** Output all get expressions to a statement list. */
	export function buildStatements(getExpressions: PropertyAccessingNode[], helper: TSHelper): ts.Statement[] {
		let grouped = groupGetExpressions(getExpressions)
		let [normal, questionDotted] = splitGetExpressions(grouped)

		let normalExp = createGroupedGetStatement(normal, helper)
		let questionDottedExps = questionDotted.map(item => createGroupedGetStatement([item], helper))

		return [
			normalExp,
			...questionDottedExps,
		]
	}


	/** Group get expressions by property belonged to object. */
	function groupGetExpressions(getExpressions: PropertyAccessingNode[]): PropertyAccessingNode[][] {
		let group = groupBy(getExpressions, (node: PropertyAccessingNode) => {
			let exp = node.expression
			let key = exp.pos >= 0 ? exp.getFullText() : ''

			if (node.questionDotToken) {
				key += '?.'
			}

			return [key, node]
		})

		return [...group.values()]
	}


	/** Split get expressions to normal, and each having question dot token. */
	function splitGetExpressions(group: PropertyAccessingNode[][]): PropertyAccessingNode[][][] {
		let normal: PropertyAccessingNode[][] = []
		let questionDotted: PropertyAccessingNode[][] = []

		for (let item of group) {
			if (item[0].questionDotToken) {
				questionDotted.push(item)
			}
			else {
				normal.push(item)
			}
		}

		return [normal, questionDotted]
	}


	/** Create a `onGetGrouped` statement. */
	function createGroupedGetStatement(group: PropertyAccessingNode[][], helper: TSHelper): ts.Statement {
		let factory = helper.ts.factory
		let node = group[0][0]
		let parameterExps = group.map(nodes => createOnGetParameter(nodes, helper))
		
		let onGet = factory.createExpressionStatement(factory.createCallExpression(
			factory.createIdentifier('onGetGrouped'),
			undefined,
			parameterExps
		))

		// `a?.b` -> `if(a) onGet(a, 'b')`
		if (node.questionDotToken) {
			return factory.createIfStatement(
				node.expression,
				onGet
			)
		}
		else {
			return onGet
		}
	}


	/** Create a parameter for `onGetGrouped` by a group of nodes. */
	function createOnGetParameter(nodes: PropertyAccessingNode[], helper: TSHelper): ts.Expression {
		let factory = helper.ts.factory
		let node = nodes[0]
		let group = groupNameExpressionKeys(nodes, helper)
		let nameExps = [...group.values()].map(nodes => getAccessingNodeNameProperty(nodes[0], helper))

		return factory.createArrayLiteralExpression(
			[
				node.expression,
				factory.createArrayLiteralExpression(
					nameExps,
				)
			]
		)
	}


	/** Get all expression keys, repetitive keys are excluded. */
	function groupNameExpressionKeys(nodes: PropertyAccessingNode[], helper: TSHelper): Map<string, PropertyAccessingNode[]> {
		return groupBy(nodes, node => [getNameKey(node, helper), node])
	}


	/** Get a name expression key. */
	function getNameKey(node: PropertyAccessingNode, helper: TSHelper): string {
		if (helper.isNodeArrayType(node.expression)) {
			return ''
		}
		else if (helper.ts.isPropertyAccessExpression(node)) {
			return `"${node.name.getText()}"`
		}
		else {
			if (helper.ts.isStringLiteral(node.argumentExpression)) {
				return `"${node.argumentExpression.text}"`
			}
			else {
				return node.argumentExpression.getText()
			}
		}
	}


	/** Get name property expression. */
	function getAccessingNodeNameProperty(node: PropertyAccessingNode, helper: TSHelper): ts.Expression {
		let factory = helper.ts.factory
		let name: ts.Expression

		if (helper.isNodeArrayType(node.expression)) {
			return factory.createStringLiteral('')
		}
		else if (helper.ts.isPropertyAccessExpression(node)) {
			name = node.name

			// `a.b`, name is 'b'.
			if (helper.ts.isIdentifier(name)) {
				name = factory.createStringLiteral(name.getText())
			}
		}
		else {
			name = node.argumentExpression
		}

		return name
	}
}