import ts from 'typescript'
import {Interpolator, Modifier, Packer, transformContext, VisitTree} from '../../core'
import {groupBy} from '../../utils'
import type {CapturedItem} from './capturer'


/** Output-ready receiver and key, without constructing an access expression. */
interface TrackingExpression {

	/** Output receiver after reference replacement and normalization. */
	exp: ts.Expression

	/** Output dependency key. */
	key: ts.Expression

	/** Whether the receiver guards this dependency directly. */
	optional: boolean

	/** Whether the output position already guarantees a present receiver. */
	guarded: boolean
}


export namespace AccessGrouper {

	/** Add a tracking import before deferred expressions are output. */
	export function addImport(type: 'get' | 'set') {
		Modifier.addImport(type === 'get' ? 'trackGet' : 'trackSet', 'lupos')
	}

	/** Group captured receivers and keys into tracking calls. */
	export function makeExpressions(items: CapturedItem[], type: 'get' | 'set', atNode?: ts.Node): ts.Expression[] {
		let expressions = items.map(item => makeTrackingExpression(item, atNode))
		let grouped = groupExpressions(expressions)
		return grouped.map(group => createGroupedExpression(group, type))
	}

	/** Output references and normalize the receiver and key independently. */
	function makeTrackingExpression(item: CapturedItem, atNode?: ts.Node): TrackingExpression {
		let exp = Interpolator.outputReplaceableChildren(item.exp) as ts.Expression
		let key: ts.Expression

		if (typeof item.key === 'string') {
			key = transformContext.factory.createStringLiteral(item.key)
		}
		else if (typeof item.key === 'number') {
			key = Packer.createNumeric(item.key)
		}
		else {
			key = Interpolator.outputReplaceableChildren(item.key) as ts.Expression
		}

		return {
			exp: Packer.normalize(simplify(exp), true) as ts.Expression,
			key: Packer.normalize(simplify(key), true) as ts.Expression,
			optional: item.optional,
			guarded: isReceiverGuardedAt(item.node, atNode),
		}
	}

	/** 
	 * Check whether can be guarded at `atNode`,
	 * a?.b(...), `...` range is guarded by `a`.
	 */
	function isReceiverGuardedAt(node: ts.Expression, atNode?: ts.Node): boolean {
		if (!atNode) {
			return false
		}

		// `a?.b[...]`.
		if (ts.isElementAccessChain(node)) {
			return VisitTree.isContains(node.argumentExpression, atNode)
		}

		// `a?.b(...)`.
		else if (ts.isCallChain(node)) {
			return node.arguments.some(arg => VisitTree.isContains(arg, atNode))
		}

		return false
	}

	/**
	 * Remove parts already evaluated at the original reference position.
	 * `(a, b, c)` -> `c`, `($ref = b)` -> `$ref`.
	 */
	function simplify(node: ts.Node): ts.Node {
		if (ts.isParenthesizedExpression(node)) {
			let exp = node.expression

			if (ts.isBinaryExpression(exp)
				&& exp.operatorToken.kind === ts.SyntaxKind.CommaToken
			) {
				return simplify(exp.right)
			}
		}

		if (ts.isBinaryExpression(node)
			&& node.operatorToken.kind === ts.SyntaxKind.EqualsToken
		) {
			return simplify(node.left)
		}

		return ts.visitEachChild(node, simplify as ts.Visitor, transformContext.transformationContext)
	}

	/** Group receivers with the same expression and optional state. */
	function groupExpressions(items: TrackingExpression[]): TrackingExpression[][] {
		let grouped = groupBy(items, item => {
			let key = transformContext.helper.getFullText(item.exp).trim()

			if (item.optional) {
				key += '?.'
			}

			if (item.guarded) {
				key += ':guarded'
			}

			return [key, item]
		})

		return [...grouped.values()]
	}

	/** Create a tracking call and preserve its optional-chain guard. */
	function createGroupedExpression(items: TrackingExpression[], type: 'get' | 'set'): ts.Expression {
		let item = items[0]
		let optionalExp: ts.Expression | null = !item.guarded && item.optional ? item.exp : null

		if (!item.guarded && !optionalExp && transformContext.helper.access.isAccess(item.exp)) {
			optionalExp = transformContext.helper.access.getOptionalChainingExp(item.exp)
		}

		let parameters = createParameters(items, item.guarded || !!optionalExp)

		let tracking = transformContext.factory.createCallExpression(
			transformContext.factory.createIdentifier(type === 'get' ? 'trackGet' : 'trackSet'),
			undefined,
			parameters
		)

		if (optionalExp) {
			return transformContext.factory.createBinaryExpression(
				Packer.removeAccessComments(optionalExp),
				transformContext.factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
				tracking
			)
		}
		else {
			return tracking
		}
	}

	/** Deduplicate keys and let a whole-object dependency cover all other keys. */
	function createParameters(items: TrackingExpression[], guarded: boolean): ts.Expression[] {
		let grouped = groupBy(items, item => [getKeyText(item.key), item])
		let keys = [...grouped.values()].map(group => group[0].key)
		let emptyKey = keys.find(key => ts.isStringLiteral(key) && key.text === '')

		if (emptyKey) {
			keys = [emptyKey]
		}

		let exp = items[0].exp
		if (guarded) {
			exp = removeGuardedOptionalChain(exp)
		}

		return [
			Packer.removeAccessComments(exp),
			...keys.map(key => Packer.removeAccessComments(key)),
		]
	}

	/** Remove receiver-chain guards already satisfied outside the call, leaving computed keys untouched. */
	function removeGuardedOptionalChain(exp: ts.Expression): ts.Expression {
		exp = Packer.normalize(exp, false) as ts.Expression

		if (ts.isPropertyAccessExpression(exp)) {
			return transformContext.factory.createPropertyAccessExpression(
				removeGuardedOptionalChain(exp.expression),
				exp.name
			)
		}
		else if (ts.isElementAccessExpression(exp)) {
			return transformContext.factory.createElementAccessExpression(
				removeGuardedOptionalChain(exp.expression),
				exp.argumentExpression
			)
		}
		else {
			return exp
		}
	}

	/** Compare literal keys independently of their source quote style. */
	function getKeyText(key: ts.Expression): string {
		if (ts.isStringLiteral(key)) {
			return JSON.stringify(key.text)
		}

		return transformContext.helper.getFullText(key)
	}
}
