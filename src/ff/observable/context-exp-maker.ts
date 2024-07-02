import type TS from 'typescript'
import {PropertyAccessingNode, helper, ts} from '../../base'
import {groupBy} from '../../utils'
import {checker} from './checker'


export namespace ContextExpMaker {
	
	/** Group expressions to lately insert a position. */
	export function makeExpressions(nonZeroExps: PropertyAccessingNode[]): TS.Expression[] {
		let grouped = groupGetExpressions(nonZeroExps)
		let [normal, questionDotted] = splitGetExpressions(grouped)
		let normalExp = createGroupedGetExpression(normal)
		let questionDottedExps = questionDotted.map(item => createGroupedGetExpression([item]))

		return [
			normalExp,
			...questionDottedExps,
		]
	}

	
	/** Group get expressions by property belonged to object. */
	function groupGetExpressions(exps: PropertyAccessingNode[]): PropertyAccessingNode[][] {
		let group = groupBy(exps, (node: PropertyAccessingNode) => {
			return [getExpKey(node), node]
		})

		return [...group.values()]
	}


	/** Make a key by a property accessing node. */
	function getExpKey(node: PropertyAccessingNode) {
		let exp = node.expression
		let key = exp.pos >= 0 ? exp.getFullText().trim() : ''

		if (node.questionDotToken) {
			key += '?.'
		}

		return key
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
	function createGroupedGetExpression(group: PropertyAccessingNode[][]): TS.Expression {
		let factory = ts.factory
		let node = group[0][0]
		let parameterExps = group.map(nodes => createOnGetParameter(nodes))
		
		let onGet = factory.createCallExpression(
			factory.createIdentifier('onGetGrouped'),
			undefined,
			parameterExps
		)

		// `a?.b` -> `a && onGet(a, 'b')`
		if (node.questionDotToken) {
			return factory.createBinaryExpression(
				node.expression,
				factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
				onGet
			)
		}
		else {
			return onGet
		}
	}


	/** Create a parameter for `onGetGrouped` by a group of nodes. */
	function createOnGetParameter(nodes: PropertyAccessingNode[]): TS.Expression {
		let factory = ts.factory
		let node = nodes[0]
		let group = groupNameExpressionKeys(nodes)
		let nameExps = [...group.values()].map(nodes => getAccessingNodeNameProperty(nodes[0]))

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
	function groupNameExpressionKeys(nodes: PropertyAccessingNode[]): Map<string, PropertyAccessingNode[]> {
		return groupBy(nodes, node => [getNameKey(node), node])
	}


	/** Get a name expression key. */
	function getNameKey(node: PropertyAccessingNode): string {
		if (helper.isNodeArrayType(node.expression) || checker.isMapOrSetReading(node)) {
			return ''
		}
		else if (ts.isPropertyAccessExpression(node)) {
			return `"${node.name.getText()}"`
		}
		else {
			if (ts.isStringLiteral(node.argumentExpression)) {
				return `"${node.argumentExpression.text}"`
			}
			else {
				return node.argumentExpression.getText()
			}
		}
	}


	/** Get name of property expression. */
	function getAccessingNodeNameProperty(node: PropertyAccessingNode): TS.Expression {
		let factory = ts.factory
		let name: TS.Expression

		if (helper.isNodeArrayType(node.expression) || checker.isMapOrSetReading(node)) {
			name = factory.createStringLiteral('')
		}
		else if (ts.isPropertyAccessExpression(node)) {

			// `a.b`, name is 'b'.
			name = factory.createStringLiteral(node.name.getText())
		}
		else {
			name = node.argumentExpression
		}

		return name
	}
}