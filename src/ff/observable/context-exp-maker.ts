import type TS from 'typescript'
import {PropertyAccessingNode, factory, helper, modifier, ts} from '../../base'
import {groupBy} from '../../utils'
import {checker} from './checker'


export namespace ContextExpMaker {
	
	/** Group expressions to lately insert a position. */
	export function makeExpressions(nonZeroExps: PropertyAccessingNode[]): TS.Expression[] {
		let grouped = groupGetExpressions(nonZeroExps)
		let exps = grouped.map(item => createGroupedGetExpression(item))

		modifier.addNamedImport('trackGet', '@pucelle/ff')

		return exps
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


	/** Create a `trackGet` statement. */
	function createGroupedGetExpression(nodes: PropertyAccessingNode[]): TS.Expression {
		let node = nodes[0]
		let parameters = createtrackGetNameParameter(nodes)
		
		let trackGet = factory.createCallExpression(
			factory.createIdentifier('trackGet'),
			undefined,
			parameters
		)

		// `a?.b` -> `a && trackGet(a, 'b')`
		if (node.questionDotToken) {
			return factory.createBinaryExpression(
				node.expression,
				factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
				trackGet
			)
		}
		else {
			return trackGet
		}
	}


	/** Create a parameter for `trackGet` by a group of nodes. */
	function createtrackGetNameParameter(nodes: PropertyAccessingNode[]): TS.Expression[] {
		let node = nodes[0]
		let group = groupNameExpressionKeys(nodes)
		let nameExps = [...group.values()].map(nodes => getAccessingNodeNameProperty(nodes[0]))

		return [
			node.expression,
			...nameExps,
		]
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