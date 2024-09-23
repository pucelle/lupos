import type TS from 'typescript'
import {AccessNode, factory, Helper, Modifier, ts} from '../../base'
import {groupBy} from '../../utils'


/** Data items pass to access grouper. */
export interface AccessGrouperToMakeItem {
	node: AccessNode
	emptyKey: boolean
}


export namespace AccessGrouper {

	/** 
	 * Add get or set tracking imports.
	 * Not add when making expressions automatically because it's outputting already.
	 */
	export function addImport(type: 'get' | 'set') {
		Modifier.addImport(type === 'get' ? 'trackGet' : 'trackSet', '@pucelle/ff')
	}
	

	/** Group expressions to lately insert a position. */
	export function makeExpressions(items: AccessGrouperToMakeItem[], type: 'get' | 'set'): TS.Expression[] {
		for (let item of items) {
			item.node = Helper.pack.normalize(item.node, true) as AccessNode
		}

		let grouped = groupExpressions(items)
		let made = grouped.map(item => createGroupedExpression(item, type))

		return made
	}

	
	/** Group get expressions by property belonged to object. */
	function groupExpressions(items: AccessGrouperToMakeItem[]): AccessGrouperToMakeItem[][] {
		let group = groupBy(items, (item: AccessGrouperToMakeItem) => {
			return [getExpressionKey(item.node), item]
		})

		return [...group.values()]
	}


	/** Make a key by a property accessing node. */
	function getExpressionKey(node: AccessNode) {
		let exp = node.expression
		let key = Helper.getFullText(exp).trim()

		if (node.questionDotToken) {
			key += '?.'
		}

		return key
	}


	/** Create a `trackGet` or `trackSet` call. */
	function createGroupedExpression(items: AccessGrouperToMakeItem[], type: 'get' | 'set'): TS.Expression {
		let node = items[0].node
		let parameters = createNameParameter(items)
		
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
	function createNameParameter(items: AccessGrouperToMakeItem[]): TS.Expression[] {
		let node = items[0].node
		let group = groupNameExpressionKeys(items)
		let nameExps = [...group.values()].map(nodes => getAccessNodeNameProperty(nodes[0]))

		return [
			Helper.pack.removeAccessComments(node.expression),
			...nameExps,
		]
	}


	/** Get all expression keys, repetitive keys are excluded. */
	function groupNameExpressionKeys(items: AccessGrouperToMakeItem[]): Map<string, AccessGrouperToMakeItem[]> {
		return groupBy(items, item => [getNameKey(item), item])
	}


	/** Get a name expression key. */
	function getNameKey(item: AccessGrouperToMakeItem): string {
		let name = getAccessNodeNameProperty(item)
		
		// 'name' -> "name"
		if (ts.isStringLiteral(name)) {
			return `"${name.text}"`
		}

		return Helper.getFullText(name)
	}


	/** Get name of property expression. */
	function getAccessNodeNameProperty(item: AccessGrouperToMakeItem): TS.Expression {
		let name: TS.Expression

		if (item.emptyKey) {
			name = factory.createStringLiteral('')
		}
		else if (ts.isPropertyAccessExpression(item.node)) {
			name = factory.createStringLiteral(Helper.getFullText(item.node.name))
		}
		else {
			name = Helper.pack.removeAccessComments(item.node.argumentExpression)
		}

		return name
	}
}