import type TS from 'typescript'
import {AccessNode, factory, Helper, Modifier, ts} from '../../base'
import {groupBy} from '../../utils'


export namespace AccessGrouper {

	/** 
	 * Add get or set tracking imports.
	 * Not add when making expressions automatically because it's outputting already.
	 */
	export function addImport(type: 'get' | 'set') {
		Modifier.addImport(type === 'get' ? 'trackGet' : 'trackSet', '@pucelle/ff')
	}
	

	/** Group expressions to lately insert a position. */
	export function makeExpressions(exps: AccessNode[], type: 'get' | 'set'): TS.Expression[] {
		exps = exps.map(exp => Helper.pack.normalize(exp, true)) as AccessNode[]

		let grouped = groupExpressions(exps)
		let made = grouped.map(item => createGroupedExpression(item, type))

		return made
	}

	
	/** Group get expressions by property belonged to object. */
	function groupExpressions(exps: AccessNode[]): AccessNode[][] {
		let group = groupBy(exps, (node: AccessNode) => {
			return [getExpressionKey(node), node]
		})

		return [...group.values()]
	}


	/** Make a key by a property accessing node. */
	function getExpressionKey(node: AccessNode) {
		let exp = node.expression
		let key = Helper.getText(exp).trim()

		if (node.questionDotToken) {
			key += '?.'
		}

		return key
	}


	/** Create a `trackGet` or `trackSet` call. */
	function createGroupedExpression(nodes: AccessNode[], type: 'get' | 'set'): TS.Expression {
		let node = nodes[0]
		let parameters = createNameParameter(nodes, type)
		
		let trackGet = factory.createCallExpression(
			factory.createIdentifier(type === 'get' ? 'trackGet' : 'trackSet'),
			undefined,
			parameters
		)

		// `a?.b` -> `a && trackGet(a, 'b')`
		if (node.questionDotToken) {
			return factory.createBinaryExpression(
				Helper.pack.removeAccessComments(node.expression),
				factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
				trackGet
			)
		}
		else {
			return trackGet
		}
	}


	/** Create a parameter for `trackGet` or `trackSet` by a group of nodes. */
	function createNameParameter(nodes: AccessNode[], type: 'get' | 'set'): TS.Expression[] {
		let node = nodes[0]
		let group = groupNameExpressionKeys(nodes, type)
		let nameExps = [...group.values()].map(nodes => getAccessNodeNameProperty(nodes[0], type))

		return [
			Helper.pack.removeAccessComments(node.expression),
			...nameExps,
		]
	}


	/** Get all expression keys, repetitive keys are excluded. */
	function groupNameExpressionKeys(nodes: AccessNode[], type: 'get' | 'set'): Map<string, AccessNode[]> {
		return groupBy(nodes, node => [getNameKey(node, type), node])
	}


	/** Get a name expression key. */
	function getNameKey(node: AccessNode, type: 'get' | 'set'): string {
		let name = getAccessNodeNameProperty(node, type)
		
		if (ts.isStringLiteral(name)) {
			return `"${name.text}"`
		}

		return Helper.getText(name)
	}


	/** Get name of property expression. */
	function getAccessNodeNameProperty(node: AccessNode, type: 'get' | 'set'): TS.Expression {
		let name: TS.Expression

		if (Helper.types.isArrayType(Helper.types.getType(node.expression)) 
			|| type === 'get' && Helper.types.isMapOrSetReading(node)
			|| type === 'set' && Helper.types.isMapOrSetWriting(node)
		) {
			name = factory.createStringLiteral('')
		}
		else if (ts.isPropertyAccessExpression(node)) {
			name = factory.createStringLiteral(Helper.getText(node.name))
		}
		else {
			name = Helper.pack.removeAccessComments(node.argumentExpression)
		}

		return name
	}
}