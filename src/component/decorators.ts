import type * as ts from 'typescript'
import {SourceFileModifier, TSHelper, defineVisitor} from '../base'


defineVisitor(

	// Method and decorated, and may need to check whether class is observable.
	(node: ts.Node, helper: TSHelper) => {
		if (!helper.ts.isMethodDeclaration(node)) {
			return false
		}

		let decorator = helper.getFirstDecorator(node)
		let decName = decorator ? helper.getDecoratorName(decorator) : undefined

		return !!decName && ['computed', 'effect', 'watch'].includes(decName)
	},
	(node: ts.MethodDeclaration, helper: TSHelper, modifier: SourceFileModifier) => {
		let decorator = helper.getFirstDecorator(node)!
		let decName = helper.getDecoratorName(decorator)

		if (decName === 'computed') {
			return compileComputedDecorator(node, helper, modifier)
		}
		else if (decName === 'effect') {
			return compileEffectDecorator(node, helper, modifier)
		}
		else if (decName === 'watch') {
			return compileWatchDecorator(node, decorator, helper, modifier)
		}

		return node
	},
)



/*
```ts
Compile `@computed prop(){...}` to:

#prop: any = undefined

#compute_prop() {...}

#reset_prop() {this.#prop = undefined}

get prop(): any {
    if (this.#prop !== undefined) {
        return this.#prop
    }
    
    beginTrack(this.#reset_prop, this)
    try {
        this.#prop = this.#compute_prop()
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
					factory.createPrivateIdentifier('#' + propName)
				),
				factory.createToken(helper.ts.SyntaxKind.EqualsToken),
				factory.createIdentifier('undefined')
				)
			)],
			false
		)
	)
	
	let getter = factory.createGetAccessorDeclaration(
		undefined,
		factory.createIdentifier(propName),
		[],
		factory.createKeywordTypeNode(helper.ts.SyntaxKind.AnyKeyword),
		factory.createBlock([
			factory.createIfStatement(
				factory.createBinaryExpression(
					factory.createPropertyAccessExpression(
						factory.createThis(),
						factory.createPrivateIdentifier('#' + propName)
					),
					factory.createToken(helper.ts.SyntaxKind.ExclamationEqualsEqualsToken),
					factory.createIdentifier('undefined')
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
						factory.createExpressionStatement(factory.createBinaryExpression(
							factory.createPropertyAccessExpression(
								factory.createThis(),
								factory.createPrivateIdentifier('#' + propName)
							),
							factory.createToken(helper.ts.SyntaxKind.EqualsToken),
							factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createThis(),
									factory.createPrivateIdentifier('#compute_' + propName)
								),
								undefined,
								[]
							)
						))
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
						[
							factory.createExpressionStatement(factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createIdentifier('console'),
									factory.createIdentifier('error')
								),
								undefined,
								[factory.createIdentifier('err')]
							))
						],
						true
					)
				),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createCallExpression(
							factory.createIdentifier('endTrack'),
							undefined,
							[]
						))
					],
					true
				)
			)],
			true
		)
	)

	modifier.addNamedImport('beginTrack', '@pucelle/lupos.js')
	modifier.addNamedImport('endTrack', '@pucelle/lupos.js')

	return [property, computeMethod, resetMethod, getter]
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

	modifier.addNamedImport('beginTrack', '@pucelle/lupos.js')
	modifier.addNamedImport('endTrack', '@pucelle/lupos.js')
	modifier.addNamedImport('enqueue', '@pucelle/lupos.js')

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
	let newValue = undefined
    try {
        newValue = this.#property_get_onWatchChange()
    }
    catch (err) {
        console.error(err)
    }
    finally {
        endTrack()
    }

	if (newValue !== this.#property_onWatchChange) {
		this.#property_onWatchChange = newValue
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
		factory.createPrivateIdentifier("#property_" + methodName),
		undefined,
		undefined,
		factory.createIdentifier("undefined")
	)
	

	let propertyGetArg = decorator.expression.arguments[0]
	let propertyGetBlock: ts.Block

	if (helper.ts.isStringLiteral(propertyGetArg)) {
		propertyGetBlock = factory.createBlock(
			[factory.createReturnStatement(factory.createPropertyAccessExpression(
				factory.createThis(),
				factory.createIdentifier(propertyGetArg.text)
			))],
			true
		)
	}
	else if (helper.ts.isFunctionExpression(propertyGetArg)) {
		propertyGetBlock = propertyGetArg.body
	}
	else {
		propertyGetBlock = factory.createBlock(
			[factory.createReturnStatement(factory.createIdentifier("undefined"))],
			true
		)
	}

	let propertyGet = factory.createMethodDeclaration(
		undefined,
		undefined,
		factory.createPrivateIdentifier("#property_get_" + methodName),
		undefined,
		undefined,
		[],
		undefined,
		propertyGetBlock
	)
	  

	let enqueueMethod = factory.createMethodDeclaration(
		undefined,
		undefined,
		factory.createPrivateIdentifier("#enqueue_" + methodName),
		undefined,
		undefined,
		[],
		undefined,
		factory.createBlock(
			[factory.createExpressionStatement(factory.createCallExpression(
				factory.createIdentifier("enqueue"),
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
					factory.createIdentifier("beginTrack"),
					undefined,
					[
						factory.createPropertyAccessExpression(
							factory.createThis(),
							factory.createPrivateIdentifier("#enqueue_" + methodName)
						),
						factory.createThis()
					]
				)),
				factory.createVariableStatement(
					undefined,
					factory.createVariableDeclarationList(
						[factory.createVariableDeclaration(
							factory.createIdentifier("newValue"),
							undefined,
							undefined,
							factory.createIdentifier("undefined")
						)],
						helper.ts.NodeFlags.Let
					)
				),
				factory.createTryStatement(
					factory.createBlock(
						[factory.createExpressionStatement(factory.createBinaryExpression(
							factory.createIdentifier("newValue"),
							factory.createToken(helper.ts.SyntaxKind.EqualsToken),
							factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createThis(),
									factory.createPrivateIdentifier("#property_get_" + methodName)
								),
								undefined,
								[]
							)
						))],
						true
					),
					factory.createCatchClause(
						factory.createVariableDeclaration(
							factory.createIdentifier("err"),
							undefined,
							undefined,
							undefined
						),
						factory.createBlock(
							[factory.createExpressionStatement(factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createIdentifier("console"),
									factory.createIdentifier("error")
								),
								undefined,
								[factory.createIdentifier("err")]
							))],
							true
						)
					),
					factory.createBlock(
						[factory.createExpressionStatement(factory.createCallExpression(
							factory.createIdentifier("endTrack"),
							undefined,
							[]
						))],
						true
					)
				),
				factory.createIfStatement(
					factory.createBinaryExpression(
						factory.createIdentifier("newValue"),
						factory.createToken(helper.ts.SyntaxKind.ExclamationEqualsEqualsToken),
						factory.createPropertyAccessExpression(
							factory.createThis(),
							factory.createPrivateIdentifier("#property_" + methodName)
						)
					),
					factory.createBlock(
						[
							factory.createExpressionStatement(factory.createBinaryExpression(
								factory.createPropertyAccessExpression(
									factory.createThis(),
									factory.createPrivateIdentifier("#property_" + methodName)
								),
								factory.createToken(helper.ts.SyntaxKind.EqualsToken),
								factory.createIdentifier("newValue")
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
	

	modifier.addNamedImport('beginTrack', '@pucelle/lupos.js')
	modifier.addNamedImport('endTrack', '@pucelle/lupos.js')
	modifier.addNamedImport('enqueue', '@pucelle/lupos.js')

	return [property, propertyGet, enqueueMethod, watchMethod]
}
