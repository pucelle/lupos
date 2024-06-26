import type TS from 'typescript'
import {checker} from './checker'
import {groupBy} from '../../utils'
import {PropertyAccessingNode, helper, ts} from '../../base'
import {VisitingTree} from './visiting-tree'
import {Context} from './context'


/** Remember where to insert expressions just below a context. */
export class ContextAppending {

	readonly context: Context

	/** The temporary variables used to reference and replace computed property accessing. */
	private tempVariables: Set<string> = new Set()

	constructor(context: Context) {
		this.context = context
	}

	/** Add a get expression. */
	addGet(exp: PropertyAccessingNode) {
		
	}

	/** Add a set expression. */
	addSet(exp: TS.BinaryExpression) {

	}

	/** 
	 * Add a split for get expressions.
	 * Then get expressions will be splitted and output before this node.
	 */
	addGetSplit(node: TS.Node, childIndex: number) {

		// Index of current children.
		let index = VisitingTree.getIndexOfDepth(this.context.nodeDepth + 1)

		
	}

	/** Check whether expression exist. */
	has(exp: PropertyAccessingNode) {
		
	}

	/** Delete an expression. */
	delete(exp: PropertyAccessingNode) {
		
	}

	/** Make expression key. */
	private makeKey(exp: PropertyAccessingNode): string {
		return exp.getText()
	}

	/** Make property part of an expression key. */
	private makeNameKey(node: PropertyAccessingNode): string {
		if (helper.isNodeArrayType(node.expression) || ObservedChecker.isMapOrSetGetHasCalling(node, helper)) {
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

	/** Output get expressions to insert before specified index. */
	output(childIndex: number): TS.Expression[] | null {
		let grouped = groupGetExpressions(getExpressions)
		let [normal, questionDotted] = splitGetExpressions(grouped)

		let normalExp = createGroupedGetExpression(normal, helper)
		let questionDottedExps = questionDotted.map(item => createGroupedGetExpression([item], helper))

		return [
			normalExp,
			...questionDottedExps,
		]
	}


	/** Group get expressions by property belonged to object. */
	private groupGetExpressions(getExpressions: PropertyAccessingNode[]): PropertyAccessingNode[][] {
		let group = groupBy(getExpressions, (node: PropertyAccessingNode) => {
			let exp = node.expression
			let key = exp.pos >= 0 ? exp.getFullText().trim() : ''

			if (node.questionDotToken) {
				key += '?.'
			}

			return [key, node]
		})

		return [...group.values()]
	}


	/** Split get expressions to normal, and each having question dot token. */
	private splitGetExpressions(group: PropertyAccessingNode[][]): PropertyAccessingNode[][][] {
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
	private createGroupedGetExpression(group: PropertyAccessingNode[][]): TS.Expression {
		let factory = ts.factory
		let node = group[0][0]
		let parameterExps = group.map(nodes => createOnGetParameter(nodes, helper))
		
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
	private createOnGetParameter(nodes: PropertyAccessingNode[]): TS.Expression {
		let factory = ts.factory
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
	private groupNameExpressionKeys(nodes: PropertyAccessingNode[]): Map<string, PropertyAccessingNode[]> {
		return groupBy(nodes, node => [getNameKey(node, helper), node])
	}


	/** Get a name expression key. */
	private getNameKey(node: PropertyAccessingNode): string {
		if (helper.isNodeArrayType(node.expression) || ObservedChecker.isMapOrSetGetHasCalling(node, helper)) {
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
	private getAccessingNodeNameProperty(node: PropertyAccessingNode): TS.Expression {
		let factory = ts.factory
		let name: TS.Expression

		if (helper.isNodeArrayType(node.expression) || ObservedChecker.isMapOrSetGetHasCalling(node, helper)) {
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