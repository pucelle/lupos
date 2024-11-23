import * as ts from 'typescript'
import {defineVisitor, factory, Interpolator, VisitTree, MethodOverwrite, Modifier, MethodInsertPosition} from '../core'
import {Helper} from '../lupos-ts-module'
import {ProcessorClassNameMap, ProcessorPropNameMap} from './decorators-shared'
import {Packer} from '../core/packer'


// Add some decorator compiled part to `constructor` or `onConnected` and `onWillDisconnect`.
defineVisitor(function(node: ts.Node, _index: number) {
	if (!ts.isClassDeclaration(node)) {
		return
	}

	let hasNeedToCompileMembers = hasLifeDecorators(node)
	if (!hasNeedToCompileMembers) {
		return
	}

	let create: MethodOverwrite
	let connect: MethodOverwrite | null = null
	let disconnect: MethodOverwrite | null = null
	let hasDeletedContextVariables = false

	// Be a component.
	if (Helper.cls.isDerivedOf(node, 'Component', '@pucelle/lupos.js')) {
		create = new MethodOverwrite(node, 'onCreated')
		connect = new MethodOverwrite(node, 'onConnected')
		disconnect = new MethodOverwrite(node, 'onWillDisconnect')
	}
	else {
		create = new MethodOverwrite(node, 'constructor')
	}

	for (let member of node.members) {
		if (!ts.isMethodDeclaration(member)
			&& !ts.isPropertyDeclaration(member)
			&& !ts.isGetAccessorDeclaration(member)
		) {
			continue
		}

		let deco = Helper.deco.getFirst(member)
		if (!deco) {
			continue
		}

		let decoName = Helper.deco.getName(deco)
		if (!decoName) {
			continue
		}

		if (['computed', 'effect', 'watch'].includes(decoName)
			&& (ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member))
		) {
			compileComputedEffectWatchDecorator(deco, decoName, member, create, connect, disconnect)
		}
		else if (decoName === 'setContext' && ts.isPropertyDeclaration(member)) {
			compileSetContextDecorator(member, create, connect, disconnect, hasDeletedContextVariables)
			Interpolator.remove(VisitTree.getIndex(deco))
			hasDeletedContextVariables = true
		}
		else if (decoName === 'useContext' && ts.isPropertyDeclaration(member)) {
			compileUseContextDecorator(member, create, connect, disconnect, hasDeletedContextVariables)
			hasDeletedContextVariables = true
		}
	}

	create.output()
	connect?.output()
	disconnect?.output()
})


function hasLifeDecorators(node: ts.ClassDeclaration) {
	return node.members.some(member => {
		if (!ts.isMethodDeclaration(member)
			&& !ts.isPropertyDeclaration(member)
			&& !ts.isGetAccessorDeclaration(member)
		) {
			return false
		}

		let decoName = Helper.deco.getFirstName(member)
		if (decoName && ['computed', 'effect', 'watch', 'useContext', 'setContext'].includes(decoName)) {
			return true
		}

		return false
	})
}


/*
```ts
Compile `@effect effectFn(){...}` to:

onConnected() {
	this.$enqueue_effectFn()
}

onWillDisconnect() {
	untrack(this.$enqueue_effectFn, this)
}
```

or

```ts
Compile `@watch('prop' / function(){...}) onWatchChange(){...}` to:

onConnected() {
	this.$enqueue_onWatchChange()
}

onWillDisconnect() {
	untrack(this.$enqueue_onWatchChange, this)
}

```
*/
function compileComputedEffectWatchDecorator(
	deco: ts.Decorator,
	decoName: string,
	decl: ts.MethodDeclaration | ts.GetAccessorDeclaration,
	create: MethodOverwrite,
	connect: MethodOverwrite | null,
	disconnect: MethodOverwrite | null
) {
	let methodName = Helper.getFullText(decl.name)
	let superCls = Helper.cls.getSuper(decl.parent as ts.ClassDeclaration)
	let isOverwritten = !!superCls && !!Helper.cls.getMember(superCls, methodName, true)

	if (isOverwritten) {
		return
	}

	let processorClassName = ProcessorClassNameMap[decoName]
	let processorPropName = '$' + methodName + '_' + ProcessorPropNameMap[decoName]
	let makerParameters = makeMakerParameters(deco, decoName, decl)

	Modifier.addImport(processorClassName, '@pucelle/ff')

	let createStatementGetter = () => factory.createExpressionStatement(factory.createBinaryExpression(
		factory.createPropertyAccessExpression(
			factory.createThis(),
			factory.createIdentifier(processorPropName)
		),
		factory.createToken(ts.SyntaxKind.EqualsToken),
		factory.createNewExpression(
			factory.createIdentifier(processorClassName),
			undefined,
			makerParameters()
		)
	))
	  
	let insertAfterSuper = decoName === 'computed'
	let insertPosition: MethodInsertPosition = insertAfterSuper ? 'after-super' : 'end'
	create.insert(() => [createStatementGetter()], insertPosition)


	// this.$prop_computer.connect()
	let connectStatement = factory.createExpressionStatement(factory.createCallExpression(
		Packer.createAccessNode(
			Packer.createAccessNode(factory.createThis(), processorPropName),
			'connect'
		),
		undefined,
		[]
	));

	(connect || create).insert(() => [connectStatement], insertPosition)
	

	if (disconnect) {
		let disconnectStatement = factory.createExpressionStatement(factory.createCallExpression(
			Packer.createAccessNode(
				Packer.createAccessNode(factory.createThis(), processorPropName),
				'disconnect'
			),
			undefined,
			[]
		))
		
		disconnect.insert(() => [disconnectStatement], 'end')
	}
}


function makeMakerParameters(
	deco: ts.Decorator,
	decoName: string,
	decl: ts.MethodDeclaration | ts.GetAccessorDeclaration
): () => ts.Expression[] {
	let methodName = Helper.getFullText(decl.name)
	let watchGetters = compileWatchGetters(deco)

	return () => {
		if (decoName === 'computed') {
			return [
				factory.createPropertyAccessExpression(
					factory.createThis(),
					factory.createIdentifier('$compute_' + methodName)
				),
				factory.createThis(),
			]
		}
		else if (decoName === 'effect') {
			return [
				factory.createPropertyAccessExpression(
					factory.createThis(),
					factory.createIdentifier(methodName)
				),
				factory.createThis(),
			]
		}
		else if (decoName === 'watch') {
			return [
				factory.createArrayLiteralExpression(watchGetters(), true),
				factory.createPropertyAccessExpression(
					factory.createThis(),
					factory.createIdentifier(methodName)
				),
				factory.createThis(),
			]
		}
		else {
			return []
		}
	}
}


/** Compile `@watch(...)` to new WatchMultipleMaker([...]). */
function compileWatchGetters(deco: ts.Decorator): () => ts.FunctionExpression[] {
	if (!ts.isCallExpression(deco.expression)) {
		return () => []
	}

	let decoArgs = deco.expression.arguments

	if (decoArgs.some(arg => ts.isStringLiteral(arg))) {
		Modifier.addImport('trackGet', '@pucelle/ff')
	}

	return () => {
		let getters: ts.FunctionExpression[] = []

		for (let arg of decoArgs) {
			if (ts.isStringLiteral(arg)) {

				// function(){trackGet(this, 'prop'); return this.prop}
				getters.push(factory.createFunctionExpression(
					undefined,
					undefined,
					undefined,
					undefined,
					[],
					undefined,
					factory.createBlock(
						[
							factory.createExpressionStatement(factory.createCallExpression(
								factory.createIdentifier('trackGet'),
								undefined,
								[
									factory.createThis(),
									arg
								]
							)),
							factory.createReturnStatement(factory.createPropertyAccessExpression(
								factory.createThis(),
								factory.createIdentifier(arg.text)
							))
						],
						false
					)
				  )
				)
			}

			// function(){...}
			else if (ts.isFunctionExpression(arg)) {
				let getterIndex = VisitTree.getIndex(arg)
				let getter = Interpolator.outputChildren(getterIndex) as ts.FunctionExpression

				getters.push(getter)
			}

			// function(){return undefined}
			else {
				getters.push(factory.createFunctionExpression(
					undefined,
					undefined,
					undefined,
					undefined,
					[],
					undefined,
					factory.createBlock(
					  	[factory.createReturnStatement(factory.createIdentifier("undefined"))],
					  	false
					)
				  )
				)
			}
		}

		return getters
	}
}


/*
```ts
Compile `@setContext prop` to:

onConnected() {
	super.onConnected()
	Component.setContextVariable(this, 'prop')
}

onWillDisconnect() {
	super.onWillDisconnect()
	Component.deleteContextVariables(this)
}
```
*/
function compileSetContextDecorator(
	propDecl: ts.PropertyDeclaration,
	create: MethodOverwrite,
	connect: MethodOverwrite | null,
	disconnect: MethodOverwrite | null,
	hasDeletedContextVariables: boolean
) {
	let propName = Helper.getFullText(propDecl.name)
	let extended = Helper.cls.getExtends(propDecl.parent as ts.ClassDeclaration)!
	let classExp = extended.expression
		
	let connectStatement = factory.createExpressionStatement(factory.createCallExpression(
		factory.createPropertyAccessExpression(
			classExp,
			factory.createIdentifier('setContextVariable')
		),
		undefined,
		[
			factory.createThis(),
			factory.createStringLiteral(propName)
		]
	));

	(connect || create).insert(() => [connectStatement], 'end')
	
	if (disconnect && !hasDeletedContextVariables) {
		let disconnectStatement = factory.createExpressionStatement(factory.createCallExpression(
			factory.createPropertyAccessExpression(
				classExp,
				factory.createIdentifier('deleteContextVariables')
			),
			undefined,
			[
				factory.createThis()
			]
		))
		
		disconnect.insert(() => [disconnectStatement], 'end')
	}
}



/*
```ts
Compile `@useContext prop` to:

onConnected() {
	super.onConnected()
	this.$prop_declared = Component.getContextVariableDeclared(this, 'prop')
}

onWillDisconnect() {
	super.onWillDisconnect()
	this.$prop_declared_by = undefined
	Component.deleteContextVariables(this)
}
```
*/
function compileUseContextDecorator(
	propDecl: ts.PropertyDeclaration,
	create: MethodOverwrite,
	connect: MethodOverwrite | null,
	disconnect: MethodOverwrite | null,
	hasDeletedContextVariables: boolean
) {
	let propName = Helper.getFullText(propDecl.name)
	let extended = Helper.cls.getExtends(propDecl.parent as ts.ClassDeclaration)!
	let classExp = extended.expression
	
	let connectStatement = factory.createExpressionStatement(factory.createBinaryExpression(
		factory.createPropertyAccessExpression(
			factory.createThis(),
			factory.createIdentifier('$' + propName + '_declared_by')
		),
		factory.createToken(ts.SyntaxKind.EqualsToken),
		factory.createCallExpression(
			factory.createPropertyAccessExpression(
				classExp,
				factory.createIdentifier('getContextVariableDeclared')
			),
			undefined,
			[
				factory.createThis(),
				factory.createStringLiteral(propName)
			]
		)
	));

	(connect || create).insert(() => [connectStatement], 'end')
	

	if (disconnect && !hasDeletedContextVariables) {
		let disconnectStatements = [
			factory.createExpressionStatement(
				factory.createBinaryExpression(
					factory.createPropertyAccessExpression(
						factory.createThis(),
						factory.createIdentifier('$' + propName + '_declared_by')
				),
				factory.createToken(ts.SyntaxKind.EqualsToken),
				factory.createIdentifier("undefined")
			))
		]
		  
		if (!hasDeletedContextVariables) {
			disconnectStatements.push(
				factory.createExpressionStatement(factory.createCallExpression(
					factory.createPropertyAccessExpression(
						classExp,
						factory.createIdentifier('deleteContextVariables')
					),
					undefined,
					[
						factory.createThis()
					]
				))
			)
		}
		
		disconnect.insert(() => disconnectStatements, 'end')
	}
}
