import type TS from 'typescript'
import {PropertyAccessNode, factory, helper, modifier, ts} from '../../base'
import {groupBy} from '../../utils'
import {ObservedChecker} from './observed-checker'


export namespace AccessGrouper {

	/** 
	 * Add get or set tracking imports.
	 * Not add when making expressions because
	 */
	export function addImport(type: 'get' | 'set') {
		modifier.addImport(type === 'get' ? 'trackGet' : 'trackSet', '@pucelle/ff')
	}
	

	/** Group expressions to lately insert a position. */
	export function makeExpressions(exps: PropertyAccessNode[], type: 'get' | 'set'): TS.Expression[] {
		exps = exps.map(exp => helper.pack.simplifyDeeply(exp))

		let grouped = groupGetExpressions(exps)
		let made = grouped.map(item => createGroupedGetExpression(item, type))

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
		let parameters = createGetNameParameter(nodes, type)
		
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
	function createGetNameParameter(nodes: PropertyAccessNode[], type: 'get' | 'set'): TS.Expression[] {
		let node = nodes[0]
		let group = groupNameExpressionKeys(nodes, type)
		let nameExps = [...group.values()].map(nodes => getAccessNodeNameProperty(nodes[0], type))

		return [
			helper.pack.removeComments(node.expression),
			...nameExps,
		]
	}


	/** Get all expression keys, repetitive keys are excluded. */
	function groupNameExpressionKeys(nodes: PropertyAccessNode[], type: 'get' | 'set'): Map<string, PropertyAccessNode[]> {
		return groupBy(nodes, node => [getNameKey(node, type), node])
	}


	/** Get a name expression key. */
	function getNameKey(node: PropertyAccessNode, type: 'get' | 'set'): string {
		let name = getAccessNodeNameProperty(node, type)
		
		if (ts.isStringLiteral(name)) {
			return `"${name.text}"`
		}

		return helper.getText(name)
	}


	/** Get name of property expression. */
	function getAccessNodeNameProperty(node: PropertyAccessNode, type: 'get' | 'set'): TS.Expression {
		let name: TS.Expression

		if (helper.types.isArrayType(helper.types.getType(node.expression)) 
			|| type === 'get' && ObservedChecker.isMapOrSetReading(node)
			|| type === 'set' && ObservedChecker.isMapOrSetWriting(node)
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