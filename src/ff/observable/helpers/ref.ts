import type TS from 'typescript'
import {PropertyAccessingNode, factory, ts} from '../../../base'


/** 
 * Replace property accessing expression to reference it.
 * `a.b().c -> (_ref_1 = a.b().c).c`
 */
export function refPropertyAccessing(node: PropertyAccessingNode, refName: string): PropertyAccessingNode {
	let exp = factory.createParenthesizedExpression(
		factory.createBinaryExpression(
			factory.createIdentifier(refName),
			factory.createToken(ts.SyntaxKind.EqualsToken),
			node as TS.Expression
		)
	)

	if (ts.isPropertyAccessExpression(node)) {
		return factory.createPropertyAccessExpression(
			exp,
			node.name
		)
	}
	else {
		return factory.createElementAccessExpression(
			exp,
			node.argumentExpression
		)
	}
}


/** 
 * Replace property accessing expression to a reference.
 * `a.b().c -> _ref_1.c`
 */
export function replaceRefedPropertyAccessing(node: PropertyAccessingNode, refName: string): PropertyAccessingNode {
	let exp = factory.createIdentifier(refName)
	if (ts.isPropertyAccessExpression(node)) {
		return factory.createPropertyAccessExpression(
			exp,
			node.name
		)
	}
	else {
		return factory.createElementAccessExpression(
			exp,
			node.argumentExpression
		)
	}
}


/** `return ...`, `await ...`, `yield ...` or `() => ...`. */
export function isBreakLikeOrImplicitReturning(node: TS.Node): node is TS.Expression {
	return ts.isReturnStatement(node)
		|| ts.isAwaitExpression(node)
		|| ts.isYieldExpression(node)
		|| ts.isArrowFunction(node.parent) && !ts.isBlock(node)
}


/** `return ...` -> `_ref = ...`. */
export function refBreakLikeOrImplicitReturning(node: TS.Expression, refName: string) {
	let exp = ts.isReturnStatement(node)
			|| ts.isAwaitExpression(node)
			|| ts.isYieldExpression(node)
		? (node as TS.ReturnStatement | TS.AwaitExpression | TS.YieldExpression).expression!
		: node as TS.Expression

	return factory.createBinaryExpression(
		factory.createIdentifier(refName),
		factory.createToken(ts.SyntaxKind.EqualsToken),
		exp
	)
}


/** `return ...` -> `return _ref`. */
export function replaceRefedBreakLikeOrImplicitReturning(node: TS.Expression, refName: string): TS.Statement {
	let identifier = factory.createIdentifier(refName)

	if (ts.isReturnStatement(node)) {
		return factory.createReturnStatement(identifier)
	}
	else if (ts.isAwaitExpression(node)) {
		return factory.createExpressionStatement(
			factory.createAwaitExpression(identifier)
		)
	}
	else if (ts.isYieldExpression(node)) {
		return factory.createExpressionStatement(
			factory.createYieldExpression(node.asteriskToken!, identifier)
		)
	}
	else {
		return factory.createReturnStatement(identifier)
	}
}



/** Return original or wrap with a return statement. */
export function returnBreakLikeOrImplicitReturning(node: TS.Expression): TS.Statement {
	if (ts.isReturnStatement(node)) {
		return node
	}
	else if (ts.isAwaitExpression(node)) {
		return factory.createExpressionStatement(
			node
		)
	}
	else if (ts.isYieldExpression(node)) {
		return factory.createExpressionStatement(
			node
		)
	}
	else {
		return factory.createReturnStatement(node)
	}
}