import ts from 'typescript'
import {transformContext} from './global'
import {AccessNode} from '../lupos-ts-module'



/** 
 * Works like ts.factory, help to test code pack range, breaking,
 * and re-pack nodes to get new nodes.
 */
export namespace Packer {

	/** 
	 * Make a property name node by property name string.
	 * If name is numeric, it must `>=0`.
	 */
	export function createPropertyName(name: string | number): ts.PropertyName {
		if (typeof name === 'string' && /^[\w$]+$/.test(name)) {
			return transformContext.factory.createIdentifier(name)
		}
		else if (typeof name === 'string' && /^#[\w$]+$/.test(name)) {
			return transformContext.factory.createPrivateIdentifier(name)
		}
		else if (typeof name === 'string') {
			return transformContext.factory.createStringLiteral(name)
		}
		else {
			return transformContext.factory.createNumericLiteral(name)
		}
	}

	/** Make a numeric literal or expression by number. */
	export function createNumeric(number: number): ts.PrefixUnaryExpression | ts.NumericLiteral {
		if (number < 0) {
			return transformContext.factory.createPrefixUnaryExpression(
				ts.SyntaxKind.MinusToken,
				transformContext.factory.createNumericLiteral(-number)
			)
		}
		else {
			return transformContext.factory.createNumericLiteral(number)
		}
	}

	/** Create an access node by expression and property name. */
	export function createAccessNode(exp: ts.Expression, name: string | number, queryDot: boolean = false): AccessNode {
		if (typeof name === 'string' && (/^[\w$]+$/.test(name) || /^#[\w$]+$/.test(name))) {
			if (queryDot) {
				return transformContext.factory.createPropertyAccessChain(
					exp,
					transformContext.factory.createToken(ts.SyntaxKind.QuestionDotToken),
					name
				)
			}
			else {
				return transformContext.factory.createPropertyAccessExpression(
					exp,
					name
				)
			}
		}
		else {
			let prop: ts.StringLiteral | ts.NumericLiteral

			if (typeof name === 'string') {
				prop = transformContext.factory.createStringLiteral(name)
			}
			else {
				prop = createNumeric(name) as ts.NumericLiteral
			}

			if (queryDot) {
				return transformContext.factory.createElementAccessChain(
					exp,
					transformContext.factory.createToken(ts.SyntaxKind.QuestionDotToken),
					prop
				)
			}
			else {
				return transformContext.factory.createElementAccessExpression(
					exp,
					prop
				)
			}
		}
	}


	/** Whether be a block or a source file. */
	export function canBlock(node: ts.Node): node is ts.SourceFile | ts.Block {
		return ts.isSourceFile(node)
			|| ts.isBlock(node)
	}

	/** Not a block, but can be extended to a block. */
	export function canExtendToBlock(node: ts.Node): node is ts.Expression | ts.ExpressionStatement {
		let parent = node.parent

		if (ts.isSourceFile(node)) {
			return false
		}

		if (ts.isBlock(node)) {
			return false
		}

		if (ts.isArrowFunction(parent)
			&& node === parent.body
		) {
			return true
		}

		if (ts.isIfStatement(parent)
			&& (node === parent.thenStatement
				|| node === parent.elseStatement
			)
		) {
			return true	
		}

		if ((ts.isForStatement(parent)
				|| ts.isForOfStatement(parent)
				|| ts.isForInStatement(parent)
				|| ts.isWhileStatement(parent)
				|| ts.isDoStatement(parent)
			)
			&& node === parent.statement
		) {
			return true
		}

		return false
	}

	/** 
	 * Whether can put statements.
	 * Means block or source file or case/default clause.
	 */
	export function canPutStatements(node: ts.Node): node is ts.SourceFile | ts.Block | ts.CaseOrDefaultClause {
		return canBlock(node)
			|| ts.isCaseOrDefaultClause(node)
	}

	/** 
	 * Whether can be extended to a block to put statements.
	 * E.g., `if ...` -> `if {...}`, `() => ...` -> `() => {...}`.
	 */
	export function canExtendToPutStatements(node: ts.Node): node is ts.Expression | ts.ExpressionStatement {
		return canExtendToBlock(node)
	}

	/** 
	 * Whether the node it returns a single value for outer,
	 * or should be just one unique expression, can't be replaced to two.
	 * so that it can be parenthesized.
	 */
	export function shouldBeUnique(node: ts.Node): node is ts.Expression {
		let parent = node.parent

		// Content of flow interrupt
		if (ts.isReturnStatement(parent)
			|| ts.isAwaitExpression(parent)
			|| ts.isYieldExpression(parent)
		) {
			if (parent.expression === node) {
				return true
			}
		}

		// Initializer of variable declaration.
		if (ts.isVariableDeclaration(parent)) {
			if (parent.initializer === node) {
				return true
			}
		}

		// `if (...)`, `case(...)`
		if (ts.isIfStatement(parent) || ts.isSwitchStatement(parent)) {
			if (node === parent.expression) {
				return true
			}
		}

		// `a ? b : c`
		else if (ts.isConditionalExpression(parent)) {
			if (node === parent.condition
				|| node === parent.whenTrue
				|| node === parent.whenFalse
			) {
				return true
			}
		}

		// `a && b`, `a || b`, `a ?? b`.
		else if (ts.isBinaryExpression(parent)) {
			if ((parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
				|| parent.operatorToken.kind === ts.SyntaxKind.BarBarToken
				|| parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
			) {
				if (node === parent.left
					|| node === parent.right
				) {
					return true
				}
			}
		}

		// `for (;;) ...`
		else if (ts.isForStatement(parent)) {
			if (node === parent.initializer
				|| node === parent.condition
				|| node === parent.incrementor
			) {
				return true
			}
		}

		// `for ... in`, `for ... of`, `while ...`, `do ...`
		else if (ts.isForOfStatement(parent)
			|| ts.isForInStatement(parent)
			|| ts.isWhileStatement(parent)
			|| ts.isDoStatement(parent)
		) {
			if (node === parent.expression) {
				return true
			}
		}

		// `a.b`, both `a` and `b` should be an expression.
		else if (ts.isPropertyAccessExpression(parent)
			|| ts.isElementAccessExpression(parent)) {
			return true
		}

		return false
	}


	/** 
	 * Bundle expressions to a parenthesized expression.
	 * `a, b -> (a, b)`
	 */
	export function parenthesizeExpressions(...exps: ts.Expression[]): ts.Expression {

		// Only one expression, returns it.
		if (exps.length === 1) {
			return exps[0]
		}

		let exp = bundleBinaryExpressions(exps, ts.SyntaxKind.CommaToken)
		return transformContext.factory.createParenthesizedExpression(exp)
	}

	/** 
	 * Bundle expressions to a single binary expression.
	 * `a, b -> a && b`
	 */
	export function bundleBinaryExpressions(exps: ts.Expression[], operator: ts.BinaryOperator): ts.Expression {

		// Only one expression, returns it.
		if (exps.length === 1) {
			return exps[0]
		}

		let exp = exps[0]

		for (let i = 1; i < exps.length; i++) {
			exp = transformContext.factory.createBinaryExpression(
				exp,
				operator,
				exps[i]
			)
		}

		return exp
	}


	/** Remove comments from a property or element access node. */
	export function removeAccessComments<T extends ts.Node>(node: T): T {
		if (ts.isPropertyAccessExpression(node)) {

			// `a?.b`
			if (node.questionDotToken) {
				return transformContext.factory.createPropertyAccessChain(
					removeAccessComments(node.expression),
					node.questionDotToken,
					removeAccessComments(node.name),
				) as ts.Node as T
			}

			// `a.b`
			else {
				return transformContext.factory.createPropertyAccessExpression(
					removeAccessComments(node.expression),
					removeAccessComments(node.name)
				) as ts.Node as T
			}
		}
		else if (ts.isElementAccessExpression(node)) {
			
			// `a?.[b]`
			if (node.questionDotToken) {
				return transformContext.factory.createElementAccessChain(
					removeAccessComments(node.expression),
					node.questionDotToken,
					removeAccessComments(node.argumentExpression),
				) as ts.Node as T
			}

			// `a[b]`
			else {
				return transformContext.factory.createElementAccessExpression(
					removeAccessComments(node.expression),
					removeAccessComments(node.argumentExpression)
				) as ts.Node as T
			}
		}
		else if (ts.isIdentifier(node)) {
			return transformContext.factory.createIdentifier(transformContext.helper.getFullText(node)) as ts.Node as T
		}
		else if (transformContext.helper.isThis(node)) {
			return transformContext.factory.createThis() as ts.Node as T
		}

		return node
	}


	/** Wrap by a statement if not yet. */
	export function toStatement(node: ts.Node): ts.Statement {
		if (ts.isStatement(node)) {
			return node
		}
		else if (ts.isVariableDeclarationList(node)) {
			return transformContext.factory.createVariableStatement(undefined, node)
		}
		else if (ts.isExpression(node)) {
			return transformContext.factory.createExpressionStatement(node)
		}
		else {
			throw new Error(`Don't know how to pack "${transformContext.helper.getFullText(node)}" to a statement!`)
		}
	}

	/** Wrap each node by a statement if not yet. */
	export function toStatements(nodes: ts.Node[]): ts.Statement[] {
		return nodes.map(n => toStatement(n))
	}


	/** 
	 * Convert code to output by combining multiple ways of describing a node to a unique way.
	 * like remove as expression, or unpack parenthesized, element access to property access.
	 * `deeply` determines whether simplify all descendants.
	 */
	export function normalize(node: ts.Node, deeply: boolean): ts.Node {
		if (ts.isAsExpression(node)
			|| ts.isParenthesizedExpression(node)
			|| ts.isNonNullExpression(node)
		) {
			return normalize(node.expression, deeply)
		}

		// a['prop'] -> a.prop
		else if (ts.isElementAccessExpression(node)
			&& ts.isStringLiteral(node.argumentExpression)
			&& /^[a-z_$][\w$_]*$/i.test(node.argumentExpression.text)
		) {

			// `a?.b`
			if (node.questionDotToken) {
				return transformContext.factory.createPropertyAccessChain(
					normalize(node.expression, deeply) as ts.Expression,
					node.questionDotToken,
					transformContext.factory.createIdentifier(node.argumentExpression.text)
				)
			}

			// `a.b`
			else {
				return transformContext.factory.createPropertyAccessExpression(
					normalize(node.expression, deeply) as ts.Expression,
					transformContext.factory.createIdentifier(node.argumentExpression.text)
				)
			}
		}

		// '...' -> "..."
		else if (ts.isStringLiteral(node)) {
			return transformContext.factory.createStringLiteral(node.text)
		}

		else if (deeply) {
			return ts.visitEachChild(node, (node: ts.Node) => normalize(node, true), transformContext.transformationContext)
		}
		else {
			return node
		}
	}


	/** Create `if (...) {return ...}`. */
	export function toIfElseStatement(condExps: ts.Expression[], exps: ts.Expression[]): ts.Statement {

		// Last branch.
		let last: ts.Statement = transformContext.factory.createBlock(
			[transformContext.factory.createReturnStatement(
				exps[exps.length - 1]
			)],
			true
		)

		for (let i = exps.length - 2; i >= 0; i--) {
			let conditionNode = condExps[i]

			let thenNode = transformContext.factory.createBlock(
				[transformContext.factory.createReturnStatement(exps[i])],
				true
			)

			last = transformContext.factory.createIfStatement(
				conditionNode,
				thenNode,
				last
			)
		}

		return last
	}


	/** Create `cond1 ? exp1 : cond2 ? exp2 ...`. */
	export function toConditionalExpression(condExps: ts.Expression[], exps: ts.Expression[]): ts.Expression {

		// Last expression.
		let last: ts.Expression = exps[exps.length - 1]

		for (let i = exps.length - 2; i >= 0; i--) {
			let conditionNode = condExps[i]
			let thenNode = exps[i]

			last = transformContext.factory.createConditionalExpression(
				conditionNode,
				transformContext.factory.createToken(ts.SyntaxKind.QuestionToken),
				thenNode,
				transformContext.factory.createToken(ts.SyntaxKind.ColonToken),
				last
			)

			last = parenthesizeExpressions(last)
		}

		return last
	}
}