import type * as ts from 'typescript'
import {SourceFileModifier, TSHelper, defineVisitor} from '../base'


defineVisitor(

	// Method and decorated, and may need to check whether class is observable.
	(node: ts.Node, helper: TSHelper) => {
		if (!helper.ts.isMethodDeclaration(node)) {
			return false
		}

		let decoName = helper.getFirstDecoratorName(node)
		return !!decoName && ['computed', 'effect', 'watch'].includes(decoName)
	},
	(node: ts.MethodDeclaration, modifier: SourceFileModifier) => {
		let helper = modifier.helper
		let decorator = helper.getFirstDecorator(node)!
		let decoName = helper.getDecoratorName(decorator)

		if (decoName === 'computed') {
			return compileComputedDecorator(node, helper, modifier)
		}
		else if (decoName === 'effect') {
			return compileEffectDecorator(node, helper, modifier)
		}
		else if (decoName === 'watch') {
			return compileWatchDecorator(node, decorator, helper, modifier)
		}

		return node
	},
)



/*
```ts
Compile `@computed prop(){...}` to:

#prop: any = undefined
#need_compute_prop: boolean = true

#compute_prop() {...}

#reset_prop() {this.#prop = undefined}

get prop(): any {
    if (!this.#need_compute_prop) {
        return this.#prop
    }
    
    beginTrack(this.#reset_prop, this)
    try {
		let newValue = this.#compute_prop()
		if (newValue !== this.#prop) {
			this.#prop = newValue
			onSet(this, 'prop')
		}
    }
    catch (err) {
        console.error(err)
    }
    finally {
        endTrack()
    }

	this.#need_compute_prop = false
}
```
*/
function compileComputedDecorator(methodDecl: ts.MethodDeclaration, helper: TSHelper, modifier: SourceFileModifier): ts.Node[] {
	let factory = helper.ts.factory
	let propName = methodDecl.name.getText()

	let property = factory.createPropertyDeclaration(
		undefined,
		factory.createPrivateIdentifier('#' + propName),
		undefined,
		factory.createKeywordTypeNode(helper.ts.SyntaxKind.AnyKeyword),
		factory.createIdentifier('undefined')
	)

	let needComputeProperty = factory.createPropertyDeclaration(
		undefined,
		factory.createPrivateIdentifier('#need_compute_' + propName),
		undefined,
		factory.createKeywordTypeNode(helper.ts.SyntaxKind.BooleanKeyword),
		factory.createIdentifier('true')
	)
	
	let computeMethod = factory.createMethodDeclaration(
		undefined,
		undefined,
		factory.createPrivateIdentifier('#compute_' + propName),
		undefined,
		undefined,
		[],
		undefined,
		methodDecl.body
	)
	
	let resetMethod = factory.createMethodDeclaration(
		undefined,
		undefined,
		factory.createPrivateIdentifier('#reset_' + propName),
		undefined,
		undefined,
		[],
		undefined,
		factory.createBlock(
			[factory.createExpressionStatement(factory.createBinaryExpression(
				factory.createPropertyAccessExpression(
					factory.createThis(),
					factory.createPrivateIdentifier('#need_compute_' + propName)
				),
				factory.createToken(helper.ts.SyntaxKind.EqualsToken),
				factory.createIdentifier('true')
			))],
			false
		)
	)

	let getter = factory.createGetAccessorDeclaration(
		undefined,
		factory.createIdentifier(propName),
		[],
		factory.createKeywordTypeNode(helper.ts.SyntaxKind.AnyKeyword),
		factory.createBlock(
			[
				factory.createIfStatement(
					factory.createPrefixUnaryExpression(
						helper.ts.SyntaxKind.ExclamationToken,
						factory.createPropertyAccessExpression(
							factory.createThis(),
							factory.createPrivateIdentifier('#need_compute_' + propName)
						)
					),
					factory.createBlock(
						[factory.createReturnStatement(factory.createPropertyAccessExpression(
							factory.createThis(),
							factory.createPrivateIdentifier('#' + propName)
						))],
						true
					),
					undefined
				),
				factory.createExpressionStatement(factory.createCallExpression(
					factory.createIdentifier('beginTrack'),
					undefined,
					[
						factory.createPropertyAccessExpression(
							factory.createThis(),
							factory.createPrivateIdentifier('#reset_' + propName)
						),
						factory.createThis()
					]
				)),
				factory.createTryStatement(
					factory.createBlock(
						[
							factory.createVariableStatement(
								undefined,
								factory.createVariableDeclarationList(
									[factory.createVariableDeclaration(
										factory.createIdentifier('newValue'),
										undefined,
										undefined,
										factory.createCallExpression(
											factory.createPropertyAccessExpression(
												factory.createThis(),
												factory.createPrivateIdentifier('#compute_' + propName)
											),
											undefined,
											[]
										)
									)],
									helper.ts.NodeFlags.Let
								)
							),
							factory.createIfStatement(
								factory.createBinaryExpression(
									factory.createIdentifier('newValue'),
									factory.createToken(helper.ts.SyntaxKind.ExclamationEqualsEqualsToken),
									factory.createPropertyAccessExpression(
										factory.createThis(),
										factory.createPrivateIdentifier('#' + propName)
									)
								),
								factory.createBlock(
									[
										factory.createExpressionStatement(factory.createBinaryExpression(
											factory.createPropertyAccessExpression(
												factory.createThis(),
												factory.createPrivateIdentifier('#' + propName)
											),
											factory.createToken(helper.ts.SyntaxKind.EqualsToken),
											factory.createIdentifier('newValue')
										)),
										factory.createExpressionStatement(factory.createCallExpression(
											factory.createIdentifier('onSet'),
											undefined,
											[
												factory.createThis(),
												factory.createStringLiteral(propName)
											]
										))
									],
									true
								),
								undefined
							)
						],
						true
					),
					factory.createCatchClause(
						factory.createVariableDeclaration(
							factory.createIdentifier('err'),
							undefined,
							undefined,
							undefined
						),
						factory.createBlock(
							[factory.createExpressionStatement(factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createIdentifier('console'),
									factory.createIdentifier('error')
								),
								undefined,
								[factory.createIdentifier('err')]
							))],
							true
						)
					),
					factory.createBlock(
						[factory.createExpressionStatement(factory.createCallExpression(
							factory.createIdentifier('endTrack'),
							undefined,
							[]
						))],
						true
					)
				),
				factory.createExpressionStatement(factory.createBinaryExpression(
					factory.createPropertyAccessExpression(
						factory.createThis(),
						factory.createPrivateIdentifier('#need_compute_' + propName)
					),
					factory.createToken(helper.ts.SyntaxKind.EqualsToken),
					factory.createFalse()
				)),
				factory.createReturnStatement(factory.createPropertyAccessExpression(
					factory.createThis(),
					factory.createPrivateIdentifier('#' + propName)
				))
			],
			true
		)
	)

	modifier.addNamedImport('beginTrack', '@pucelle/ff')
	modifier.addNamedImport('endTrack', '@pucelle/ff')
	modifier.addNamedImport('onSet', '@pucelle/ff')

	return [property, needComputeProperty, computeMethod, resetMethod, getter]
}


/*
```ts
Compile `@effect effectFn(){...}` to:

onConnected() {
	this.#enqueue_effectFn()
}

onDisconnected() {
	untrack(this.#enqueue_effectFn, this)
}

#enqueue_effectFn() {
	enqueue(this.effectFn, this)
}

effectFn() {
    beginTrack(this.#enqueue_effectFn, this)
    try {
        ...
    }
    catch (err) {
        console.error(err)
    }
    finally {
        endTrack()
    }
}
```
*/
function compileEffectDecorator(methodDecl: ts.MethodDeclaration, helper: TSHelper, modifier: SourceFileModifier): ts.Node[] {
	let factory = helper.ts.factory
	let methodName = methodDecl.name.getText()

	let enqueueMethod = factory.createMethodDeclaration(
		undefined,
		undefined,
		factory.createPrivateIdentifier('#enqueue_' + methodName),
		undefined,
		undefined,
		[],
		undefined,
		factory.createBlock(
		 	[
				factory.createExpressionStatement(factory.createCallExpression(
					factory.createIdentifier('enqueue'),
					undefined,
					[
						factory.createPropertyAccessExpression(
							factory.createThis(),
							factory.createIdentifier(methodName)
						),
						factory.createThis()
					]
				))
			],
			true
		)
	)
	
	let effectMethod = factory.createMethodDeclaration(
		undefined,
		undefined,
		factory.createIdentifier(methodName),
		undefined,
		undefined,
		[],
		undefined,
		factory.createBlock(
			[
				factory.createExpressionStatement(factory.createCallExpression(
					factory.createIdentifier('beginTrack'),
					undefined,
					[
						factory.createPropertyAccessExpression(
							factory.createThis(),
							factory.createPrivateIdentifier('#enqueue_' + methodName)
						),
						factory.createThis()
					]
				)),
				factory.createTryStatement(
					methodDecl.body!,
					factory.createCatchClause(
						factory.createVariableDeclaration(
							factory.createIdentifier('err'),
							undefined,
							undefined,
							undefined
						),
						factory.createBlock(
							[factory.createExpressionStatement(factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createIdentifier('console'),
									factory.createIdentifier('error')
								),
								undefined,
								[factory.createIdentifier('err')]
							))],
							true
						)
					),
					factory.createBlock(
						[factory.createExpressionStatement(factory.createCallExpression(
							factory.createIdentifier('endTrack'),
							undefined,
							[]
						))],
						true
					)
				)
			],
			true
		)
	)

	modifier.addNamedImport('beginTrack', '@pucelle/ff')
	modifier.addNamedImport('endTrack', '@pucelle/ff')
	modifier.addNamedImport('enqueue', '@pucelle/ff')

	return [enqueueMethod, effectMethod]
}


/*
```ts
Compile `@watch('prop' / function(){...}) onWatchChange(){...}` to:

onConnected() {
	this.#enqueue_onWatchChange()
}

onDisconnected() {
	untrack(this.#enqueue_onWatchChange, this)
}

#property_onWatchChange = undefined

#property_get_onWatchChange() {
	this.prop
	// or
	...
}

#enqueue_onWatchChange() {
	enqueue(this.onWatchChange, this)
}

onWatchChange() {
    beginTrack(this.#enqueue_onWatchChange, this)
	let new_value_onWatchChange = undefined
    try {
        new_value_onWatchChange = this.#property_get_onWatchChange()
    }
    catch (err) {
        console.error(err)
    }
    finally {
        endTrack()
    }

	if (new_value_onWatchChange !== this.#property_onWatchChange) {
		this.#property_onWatchChange = new_value_onWatchChange
		...
	}
}
```
*/
function compileWatchDecorator(methodDecl: ts.MethodDeclaration, decorator: ts.Decorator, helper: TSHelper, modifier: SourceFileModifier): ts.Node[] {
	let factory = helper.ts.factory
	let methodName = methodDecl.name.getText()

	if (!helper.ts.isCallExpression(decorator.expression)) {
		return []
	}


	let property = factory.createPropertyDeclaration(
		undefined,
		factory.createPrivateIdentifier('#property_' + methodName),
		undefined,
		undefined,
		factory.createIdentifier('undefined')
	)
	

	let propertyGetArg = decorator.expression.arguments[0]
	let propertyGetBlock: ts.Block

	if (helper.ts.isStringLiteral(propertyGetArg)) {
		propertyGetBlock = factory.createBlock(
			[
				factory.createExpressionStatement(factory.createCallExpression(
					factory.createIdentifier('onGetGrouped'),
					undefined,
					[factory.createArrayLiteralExpression(
						[
							factory.createThis(),
							factory.createArrayLiteralExpression([
								factory.createStringLiteral(propertyGetArg.text)
							])
						]
					)]
				)),
				factory.createReturnStatement(factory.createPropertyAccessExpression(
					factory.createThis(),
					factory.createIdentifier(propertyGetArg.text)
				))
			],
			true
		)
	}
	else if (helper.ts.isFunctionExpression(propertyGetArg)) {
		propertyGetBlock = propertyGetArg.body
	}
	else {
		propertyGetBlock = factory.createBlock(
			[factory.createReturnStatement(factory.createIdentifier('undefined'))],
			true
		)
	}

	let propertyGet = factory.createMethodDeclaration(
		undefined,
		undefined,
		factory.createPrivateIdentifier('#property_get_' + methodName),
		undefined,
		undefined,
		[],
		undefined,
		propertyGetBlock
	)
	  

	let enqueueMethod = factory.createMethodDeclaration(
		undefined,
		undefined,
		factory.createPrivateIdentifier('#enqueue_' + methodName),
		undefined,
		undefined,
		[],
		undefined,
		factory.createBlock(
			[factory.createExpressionStatement(factory.createCallExpression(
				factory.createIdentifier('enqueue'),
				undefined,
				[
					factory.createPropertyAccessExpression(
						factory.createThis(),
						factory.createIdentifier(methodName)
					),
					factory.createThis()
				]
			))],
			true
		)
	)

	
	let watchMethod = factory.createMethodDeclaration(
		undefined,
		undefined,
		factory.createIdentifier(methodName),
		undefined,
		undefined,
		[],
		undefined,
		factory.createBlock(
			[
				factory.createExpressionStatement(factory.createCallExpression(
					factory.createIdentifier('beginTrack'),
					undefined,
					[
						factory.createPropertyAccessExpression(
							factory.createThis(),
							factory.createPrivateIdentifier('#enqueue_' + methodName)
						),
						factory.createThis()
					]
				)),
				factory.createVariableStatement(
					undefined,
					factory.createVariableDeclarationList(
						[factory.createVariableDeclaration(
							factory.createIdentifier('new_value'),
							undefined,
							undefined,
							factory.createIdentifier('undefined')
						)],
						helper.ts.NodeFlags.Let
					)
				),
				factory.createTryStatement(
					factory.createBlock(
						[factory.createExpressionStatement(factory.createBinaryExpression(
							factory.createIdentifier('new_value'),
							factory.createToken(helper.ts.SyntaxKind.EqualsToken),
							factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createThis(),
									factory.createPrivateIdentifier('#property_get_' + methodName)
								),
								undefined,
								[]
							)
						))],
						true
					),
					factory.createCatchClause(
						factory.createVariableDeclaration(
							factory.createIdentifier('err'),
							undefined,
							undefined,
							undefined
						),
						factory.createBlock(
							[factory.createExpressionStatement(factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createIdentifier('console'),
									factory.createIdentifier('error')
								),
								undefined,
								[factory.createIdentifier('err')]
							))],
							true
						)
					),
					factory.createBlock(
						[factory.createExpressionStatement(factory.createCallExpression(
							factory.createIdentifier('endTrack'),
							undefined,
							[]
						))],
						true
					)
				),
				factory.createIfStatement(
					factory.createBinaryExpression(
						factory.createIdentifier('new_value'),
						factory.createToken(helper.ts.SyntaxKind.ExclamationEqualsEqualsToken),
						factory.createPropertyAccessExpression(
							factory.createThis(),
							factory.createPrivateIdentifier('#property_' + methodName)
						)
					),
					factory.createBlock(
						[
							factory.createExpressionStatement(factory.createBinaryExpression(
								factory.createPropertyAccessExpression(
									factory.createThis(),
									factory.createPrivateIdentifier('#property_' + methodName)
								),
								factory.createToken(helper.ts.SyntaxKind.EqualsToken),
								factory.createIdentifier('new_value')
							)),
							...methodDecl.body?.statements || [],
						],
						true
					),
					undefined
				)
			],
			true
		)
	)
	
	modifier.addNamedImport('beginTrack', '@pucelle/ff')
	modifier.addNamedImport('endTrack', '@pucelle/ff')
	modifier.addNamedImport('enqueue', '@pucelle/ff')

	return [property, propertyGet, enqueueMethod, watchMethod]
}
