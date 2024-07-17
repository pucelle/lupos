import type TS from 'typescript'
import {PropertyAccessNode, factory, helper, modifier, ts} from '../../base'
import {groupBy} from '../../utils'
import {ObservedChecker} from './observed-checker'


export namespace AccessGrouper {

	/** Add get or set tracking imports. */
	export function addImport(type: 'get' | 'set') {
		modifier.addImport(type === 'get' ? 'trackGet' : 'trackSet', '@pucelle/ff')
	}
	

	/** Group expressions to lately insert a position. */
	export function makeExpressions(exps: PropertyAccessNode[], type: 'get' | 'set'): TS.Expression[] {
		exps = exps.map(exp => helper.pack.simplifyDeeply(exp))

		let grouped = groupGetExpressions(exps)
		let made = grouped.map(item => createGroupedGetExpression(item, type))

		if (made.length > 0) {
			modifier.addImport(type === 'get' ? 'trackGet' : 'trackSet', '@pucelle/ff')
		}

		return made
	}

	
	/** Group get expressions by property belonged to object. */
	function groupGetExpressions(exps: PropertyAccessNode[]): PropertyAccessNode[][] {
		let group = groupBy(exps, (node: PropertyAccessNode) => {
			return [getExpKey(node), node]
		})

		return [...group.values()]
	}


	/** Make a key by a property accessing node. */
	function getExpKey(node: PropertyAccessNode) {
		let exp = node.expression
		let key = helper.getText(exp).trim()

		if (node.questionDotToken) {
			key += '?.'
		}

		return key
	}


	/** Create a `trackGet` statement. */
	function createGroupedGetExpression(nodes: PropertyAccessNode[], type: 'get' | 'set'): TS.Expression {
		let node = nodes[0]
		let parameters = createGetNameParameter(nodes)
		
		let trackGet = factory.createCallExpression(
			factory.createIdentifier(type === 'get' ? 'trackGet' : 'trackSet'),
			undefined,
			parameters
		)

		// `a?.b` -> `a && trackGet(a, 'b')`
		if (node.questionDotToken) {
			return factory.createBinaryExpression(
				helper.pack.removeComments(node.expression),
				factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
				trackGet
			)
		}
		else {
			return trackGet
		}
	}


	/** Create a parameter for `trackGet` by a group of nodes. */
	function createGetNameParameter(nodes: PropertyAccessNode[]): TS.Expression[] {
		let node = nodes[0]
		let group = groupNameExpressionKeys(nodes)
		let nameExps = [...group.values()].map(nodes => getAccessingNodeNameProperty(nodes[0]))

		return [
			helper.pack.removeComments(node.expression),
			...nameExps,
		]
	}


	/** Get all expression keys, repetitive keys are excluded. */
	function groupNameExpressionKeys(nodes: PropertyAccessNode[]): Map<string, PropertyAccessNode[]> {
		return groupBy(nodes, node => [getNameKey(node), node])
	}


	/** Get a name expression key. */
	function getNameKey(node: PropertyAccessNode): string {
		if (helper.types.isArray(helper.types.getType(node.expression))
			|| ObservedChecker.isMapOrSetReading(node)
		) {
			return ''
		}
		else if (ts.isPropertyAccessExpression(node)) {
			return `"${helper.getText(node.name)}"`
		}
		else {
			if (ts.isStringLiteral(node.argumentExpression)) {
				return `"${node.argumentExpression.text}"`
			}
			else {
				return helper.getText(node.argumentExpression)
			}
		}
	}


	/** Get name of property expression. */
	function getAccessingNodeNameProperty(node: PropertyAccessNode): TS.Expression {
		let name: TS.Expression

		if (helper.types.isArray(helper.types.getType(node.expression)) 
			|| ObservedChecker.isMapOrSetReading(node)
		) {
			name = factory.createStringLiteral('')
		}
		else if (ts.isPropertyAccessExpression(node)) {
			name = factory.createStringLiteral(helper.getText(node.name))
		}
		else {
			name = helper.pack.removeComments(node.argumentExpression)
		}

		return name
	}
}