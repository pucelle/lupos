import type TS from 'typescript'
import {Helper, ts, defineVisitor, Modifier, factory, Interpolator, InterpolationContentType, VisitTree} from '../base'
import {addToList} from '../utils'


defineVisitor(function(node: TS.Node, index: number) {
		
	// Method or getter and decorated.
	if (!ts.isMethodDeclaration(node) && !ts.isGetAccessorDeclaration(node)) {
		return
	}

	let decorator = Helper.deco.getFirst(node)!
	if (!decorator) {
		return
	}

	let decoName = Helper.deco.getName(decorator)
	if (!decoName || !['computed', 'effect', 'watch', 'immediateWatch'].includes(decoName)) {
		return
	}

	let memberName = Helper.getFullText(node.name)
	let superCls = Helper.cls.getSuper(node.parent as TS.ClassDeclaration)
	let isOverwritten = !!superCls && !!Helper.cls.getMember(superCls, memberName, true)

	Modifier.removeImportOf(decorator)
	let replace: () => TS.Node[]

	if (decoName === 'computed') {
		replace = compileComputedDecorator(node as TS.GetAccessorDeclaration, isOverwritten)
	}
	else if (decoName === 'effect') {
		replace = compileEffectDecorator(node as TS.MethodDeclaration, isOverwritten)
	}
	else {
		replace = compileWatchDecorator(decoName, node as TS.MethodDeclaration, decorator, isOverwritten)
	}

	Interpolator.replace(index, InterpolationContentType.Normal, replace)
})



/*
```ts
Compile `@computed prop(){...}` to:

onWillDisconnect() {
	this.$reset_prop2()
	untrack(this.$reset_prop, this)
}

$prop: any = undefined
$needs_compute_prop: boolean = true

$compute_prop() {...}

$reset_prop() {this.$prop = undefined}

get prop(): any {
    if (!this.$needs_compute_prop) {
        return this.$prop
    }
    
    beginTrack(this.$reset_prop, this)
    try {
		let newValue = this.$compute_prop()
		if (newValue !== this.$prop) {
			this.$prop = newValue
			trackSet(this, 'prop')
		}
    }
    catch (err) {
        console.error(err)
    }
    finally {
        endTrack()
    }

	this.$needs_compute_prop = false
}
```
*/
function compileComputedDecorator(methodDecl: TS.GetAccessorDeclaration, isOverwritten: boolean): () => TS.Node[] {
	Modifier.addImport('beginTrack', '@pucelle/ff')
	Modifier.addImport('endTrack', '@pucelle/ff')
	Modifier.addImport('trackSet', '@pucelle/ff')

	return () => {
		let propName = Helper.getFullText(methodDecl.name)
		let newBody = Interpolator.outputChildren(VisitTree.getIndex(methodDecl.body!)) as TS.Block

		let property = factory.createPropertyDeclaration(
			undefined,
			factory.createIdentifier('$' + propName),
			undefined,
			factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
			factory.createIdentifier('undefined')
		)

		let needsComputeProperty = factory.createPropertyDeclaration(
			undefined,
			factory.createIdentifier('$needs_compute_' + propName),
			undefined,
			factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
			factory.createIdentifier('true')
		)

		let computeMethod = factory.createMethodDeclaration(
			undefined,
			undefined,
			factory.createIdentifier('$compute_' + propName),
			undefined,
			undefined,
			[],
			undefined,
			newBody
		)
		
		let resetMethod = factory.createMethodDeclaration(
			undefined,
			undefined,
			factory.createIdentifier('$reset_' + propName),
			undefined,
			undefined,
			[],
			undefined,
			factory.createBlock(
				[factory.createExpressionStatement(factory.createBinaryExpression(
					factory.createPropertyAccessExpression(
						factory.createThis(),
						factory.createIdentifier('$needs_compute_' + propName)
					),
					factory.createToken(ts.SyntaxKind.EqualsToken),
					factory.createIdentifier('true')
				))],
				false
			)
		)

		let getter = factory.createGetAccessorDeclaration(
			undefined,
			factory.createIdentifier(propName),
			[],
			factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
			factory.createBlock(
				[
					factory.createIfStatement(
						factory.createPrefixUnaryExpression(
							ts.SyntaxKind.ExclamationToken,
							factory.createPropertyAccessExpression(
								factory.createThis(),
								factory.createIdentifier('$needs_compute_' + propName)
							)
						),
						factory.createBlock(
							[factory.createReturnStatement(factory.createPropertyAccessExpression(
								factory.createThis(),
								factory.createIdentifier('$' + propName)
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
								factory.createIdentifier('$reset_' + propName)
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
													factory.createIdentifier('$compute_' + propName)
												),
												undefined,
												[]
											)
										)],
										ts.NodeFlags.Let
									)
								),
								factory.createIfStatement(
									factory.createBinaryExpression(
										factory.createIdentifier('newValue'),
										factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
										factory.createPropertyAccessExpression(
											factory.createThis(),
											factory.createIdentifier('$' + propName)
										)
									),
									factory.createBlock(
										[
											factory.createExpressionStatement(factory.createBinaryExpression(
												factory.createPropertyAccessExpression(
													factory.createThis(),
													factory.createIdentifier('$' + propName)
												),
												factory.createToken(ts.SyntaxKind.EqualsToken),
												factory.createIdentifier('newValue')
											)),
											factory.createExpressionStatement(factory.createCallExpression(
												factory.createIdentifier('trackSet'),
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
							factory.createIdentifier('$needs_compute_' + propName)
						),
						factory.createToken(ts.SyntaxKind.EqualsToken),
						factory.createFalse()
					)),
					factory.createReturnStatement(factory.createPropertyAccessExpression(
						factory.createThis(),
						factory.createIdentifier('$' + propName)
					))
				],
				true
			)
		)

		if (isOverwritten) {
			return [computeMethod]
		}
		else {
			return [property, needsComputeProperty, computeMethod, resetMethod, getter]
		}
	}
}


/*
```ts
Compile `@effect effectFn(){...}` to:

onWillDisconnect() {
	untrack(this.$enqueue_effectFn, this)
}

$enqueue_effectFn() {
	enqueueUpdate(this.$run_effectFn, this)
}

$run_effectFn() {
    beginTrack(this.$enqueue_effectFn, this)
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

effectFn(){...}
```
*/
function compileEffectDecorator(methodDecl: TS.MethodDeclaration, isOverwritten: boolean): () => TS.Node[] {
	Modifier.addImport('beginTrack', '@pucelle/ff')
	Modifier.addImport('endTrack', '@pucelle/ff')
	Modifier.addImport('enqueueUpdate', '@pucelle/ff')

	return () => {
		let methodName = Helper.getFullText(methodDecl.name)
		let newBody = Interpolator.outputChildren(VisitTree.getIndex(methodDecl.body!)) as TS.Block

		let enqueueMethod = factory.createMethodDeclaration(
			undefined,
			undefined,
			factory.createIdentifier('$enqueue_' + methodName),
			undefined,
			undefined,
			[],
			undefined,
			factory.createBlock(
				[
					factory.createExpressionStatement(factory.createCallExpression(
						factory.createIdentifier('enqueueUpdate'),
						undefined,
						[
							factory.createPropertyAccessExpression(
								factory.createThis(),
								factory.createIdentifier('$run_' + methodName)
							),
							factory.createThis()
						]
					))
				],
				true
			)
		)
		
		let runEffectMethod = factory.createMethodDeclaration(
			undefined,
			undefined,
			factory.createIdentifier('$run_' + methodName),
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
								factory.createIdentifier('$enqueue_' + methodName)
							),
							factory.createThis()
						]
					)),
					factory.createTryStatement(
						factory.createBlock(
							[factory.createExpressionStatement(factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createThis(),
									factory.createIdentifier(methodName)
								),
								undefined,
								[]
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
					)
				],
				true
			)
		)

		// Undecorated original method.
		let newMethodDecl = factory.createMethodDeclaration(
			undefined,
			undefined,
			factory.createIdentifier(methodName),
			undefined,
			undefined,
			methodDecl.parameters,
			undefined,
			newBody
		)

		if (isOverwritten) {
			return [newMethodDecl]
		}

		return [enqueueMethod, runEffectMethod, newMethodDecl]
	}
}


/*
```ts
Compile `@watch('prop' / function(){...}) onWatchChange(){...}` to:

onConnected() {
	this.$enqueue_onWatchChange()
}

onWillDisconnect() {
	untrack(this.$enqueue_onWatchChange, this)
}

$property_onWatchChange = undefined

$enqueue_onWatchChange() {
	enqueueUpdate(this.onWatchChange, this)
}

$compare_onWatchChange() {
	beginTrack(this.$enqueue_onWatchChange, this)
	let new_value = undefined
    try {
        new_value = this.prop
		trackGet(this, 'prop')
    }
    catch (err) {
        console.error(err)
    }
    finally {
        endTrack()
    }

	if (new_value !== this.$property_onWatchChange) {
		this.$property_onWatchChange = new_value
		...
		this.onWatchChange(new_value)
	}
}

onWatchChange(prop) {
   ...
}
```
*/
function compileWatchDecorator(decoName: string, methodDecl: TS.MethodDeclaration, decorator: TS.Decorator, isOverwritten: boolean): () => TS.Node[] {
	Modifier.addImport('beginTrack', '@pucelle/ff')
	Modifier.addImport('endTrack', '@pucelle/ff')
	Modifier.addImport('enqueueUpdate', '@pucelle/ff')

	let immediateWatch = decoName === 'immediateWatch'
	let methodName = Helper.getFullText(methodDecl.name)

	if (!ts.isCallExpression(decorator.expression)) {
		return () => []
	}


	let propertyGetArgs = decorator.expression.arguments
	for (let arg of propertyGetArgs) {
		if (ts.isStringLiteral(arg)) {
			Modifier.addImport('trackGet', '@pucelle/ff')
		}
	}

	return () => {
		let newBody = Interpolator.outputChildren(VisitTree.getIndex(methodDecl.body!)) as TS.Block

		// [] / undefined
		let valueInit = immediateWatch
			? factory.createNewExpression(
				factory.createIdentifier('Array'),
				undefined,
				[factory.createNumericLiteral(propertyGetArgs.length)]
			)
			: undefined

		// $values_XXX = [] / undefined
		let valueDecl = factory.createPropertyDeclaration(
			undefined,
			factory.createIdentifier('$values_' + methodName),
			undefined,
			undefined,
			valueInit	  
		)
		

		let trackNames: string[] = []
		let propertyGetters: TS.Expression[] = []

		for (let arg of propertyGetArgs) {
			if (ts.isStringLiteral(arg)) {

				// 'prop'
				addToList(trackNames, arg.text)

				// this.prop
				propertyGetters.push(factory.createPropertyAccessExpression(
					factory.createThis(),
					factory.createIdentifier(arg.text)
				))
			}

			// (function(){}).call(this)
			else if (ts.isFunctionExpression(arg)) {
				let fnIndex = VisitTree.getIndex(arg)
				let fn = Interpolator.outputChildren(fnIndex) as TS.FunctionExpression

				propertyGetters.push(factory.createCallExpression(
					factory.createPropertyAccessExpression(
						fn,
					  	factory.createIdentifier('call')
					),
					undefined,
					[factory.createThis()]
				))
			}
			else {
				propertyGetters.push(factory.createIdentifier('undefined'))
			}
		}

		// trackGet(this, 'prop1', 'prop2')
		let trackExps = trackNames.length > 0
			? [
				factory.createCallExpression(
				factory.createIdentifier('trackGet'),
				undefined,
				[
					factory.createThis(),
					...trackNames.map(name => factory.createStringLiteral(name))
				]
			)]
		 	: []

		let enqueueMethod = factory.createMethodDeclaration(
			undefined,
			undefined,
			factory.createIdentifier('$enqueue_' + methodName),
			undefined,
			undefined,
			[],
			undefined,
			factory.createBlock(
				[factory.createExpressionStatement(factory.createCallExpression(
					factory.createIdentifier('enqueueUpdate'),
					undefined,
					[
						factory.createPropertyAccessExpression(
							factory.createThis(),
							factory.createIdentifier('$compare_' + methodName)
						),
						factory.createThis()
					]
				))],
				true
			)
		)


		// let values_0, values_1
		let valueDecls = propertyGetters.map((_getter: TS.Expression, index: number) =>
			factory.createVariableDeclaration(
				factory.createIdentifier('values_' + index),
				undefined,
				undefined,
				undefined
			)
		)

		// values_0 = ...; values_1 = ...
		let valueAssignExps = propertyGetters.map((getter: TS.Expression, index: number) =>
			factory.createBinaryExpression(
				factory.createIdentifier('values_' + index),
				factory.createToken(ts.SyntaxKind.EqualsToken),
				getter
			)
		)

		// values_0 !== this.values_XXX[0] && ...
		let compareExps: TS.Expression[] = []

		// this.values_XXX[0] = values_0, ...
		let valuePropAssignExps: TS.Expression[] = []

		for (let i = 0; i < propertyGetters.length; i++) {
			compareExps.push(factory.createBinaryExpression(
				factory.createIdentifier('values_' + i),
				factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
				factory.createElementAccessExpression(
					factory.createPropertyAccessExpression(
						factory.createThis(),
						factory.createIdentifier('$values_' + methodName)
					),
					factory.createNumericLiteral(i)
				),
			))

			valuePropAssignExps.push(
				factory.createBinaryExpression(
					factory.createElementAccessExpression(
						factory.createPropertyAccessExpression(
							factory.createThis(),
							factory.createIdentifier('$values_' + methodName)
						),
						factory.createNumericLiteral(i)
					),
					factory.createToken(ts.SyntaxKind.EqualsToken),
					factory.createIdentifier('values_' + i)
				)
			)
		}

		// if (value_0 !== this.$values_XXX) {...}
		let compareStatement = factory.createIfStatement(
			Helper.pack.bundleBinaryExpressions(compareExps, ts.SyntaxKind.BarBarToken),
			factory.createBlock(
				[
					...Helper.pack.toStatements(valuePropAssignExps),
					Helper.pack.toStatement(factory.createCallExpression(
						factory.createPropertyAccessExpression(
							factory.createThis(),
							factory.createIdentifier(methodName)
						),
						undefined,
						propertyGetters.map((_getter: any, index: number) => 
							factory.createIdentifier('values_' + index),
						)
					)),
				],
				true
			),
			undefined
		)

		// if (!this.$value_XXX) {...} else 
		if (!immediateWatch) {
			compareStatement = factory.createIfStatement(
				factory.createPrefixUnaryExpression(
					ts.SyntaxKind.ExclamationToken,
					factory.createPropertyAccessExpression(
						factory.createThis(),
						factory.createIdentifier('$values_' + methodName)
					)
				),
				factory.createBlock(
				  	Helper.pack.toStatements([
						factory.createBinaryExpression(
							factory.createPropertyAccessExpression(
								factory.createThis(),
								factory.createIdentifier('$values_' + methodName)
							),
							factory.createToken(ts.SyntaxKind.EqualsToken),
							factory.createNewExpression(
								factory.createIdentifier('Array'),
								undefined,
								[factory.createNumericLiteral(propertyGetters.length)]
							)
						),
						...valuePropAssignExps,		  
					]),
				  	true
				),
				compareStatement
			)  
		}

		// $compare_XXX() {...}
		let compareMethod = factory.createMethodDeclaration(
			undefined,
			undefined,
			factory.createIdentifier('$compare_' + methodName),
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
								factory.createIdentifier('$enqueue_' + methodName)
							),
							factory.createThis()
						]
					)),
					factory.createVariableStatement(
						undefined,
						factory.createVariableDeclarationList(
							valueDecls,
							ts.NodeFlags.Let
						)
					),
					factory.createTryStatement(
						factory.createBlock(
							Helper.pack.toStatements([
								...valueAssignExps,
								...trackExps,
							]),
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
					compareStatement,
				],
				true
			)
		)

		// Undecorated original method.
		let newMethodDecl = factory.createMethodDeclaration(
			undefined,
			undefined,
			factory.createIdentifier(methodName),
			undefined,
			undefined,
			methodDecl.parameters,
			undefined,
			newBody
		)

		if (isOverwritten) {
			return [newMethodDecl]
		}

		return [valueDecl, enqueueMethod, compareMethod, newMethodDecl]
	}
}
