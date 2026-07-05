import ts from 'typescript'
import {defineVisitor, factory, Interpolator, MethodOverwrite, Modifier, helper} from '../core'
import {ProcessorClassNameMap, ProcessorPropNameMap} from './decorators-shared'
import {Packer} from '../core/packer'


// Add some decorator compiled part to `constructor` or `onConnected` and `onWillDisconnect`.
defineVisitor(function(node: ts.Node) {
	if (!ts.isClassDeclaration(node)) {
		return
	}

	let lifeMembers = getLifeMembers(node)
	if (lifeMembers.length === 0) {
		return
	}

	// Class must implements `Connectable`.
	if (!helper.class.isImplementedOf(node, 'Connectable', 'lupos')
		&& !helper.objectLike.isDerivedOf(node, 'Component', 'lupos.html')
	) {
		return
	}

	let create = new MethodOverwrite(node, 'onCreated')
	let connect = new MethodOverwrite(node, 'onConnected')
	let disconnect = new MethodOverwrite(node, 'onWillDisconnect')
	let hasDeletedContextVariables = false

	for (let {deco, decoName, member} of lifeMembers) {
		if (decoName && ['computed', 'asyncComputed', 'effect', 'watch', 'watchMulti'].includes(decoName)
			&& (ts.isMethodDeclaration(member)
				|| ts.isGetAccessorDeclaration(member)
				|| ts.isPropertyDeclaration(member)
			)
		) {
			compileComputedEffectWatchDecorator(deco!, decoName, member, create, connect, disconnect)
		}
		else if (decoName === 'setContext' && ts.isPropertyDeclaration(member)) {
			compileSetContextDecorator(member, create, connect, disconnect, hasDeletedContextVariables)
			Interpolator.remove(deco!)
			hasDeletedContextVariables = true
		}
		else if (decoName === 'useContext' && ts.isPropertyDeclaration(member)) {
			compileUseContextDecorator(member, create, connect, disconnect, hasDeletedContextVariables)
			hasDeletedContextVariables = true
		}
		else {
			compileConnectableProperty(member as ts.PropertyDeclaration, create, connect, disconnect)
		}
	}

	create.output()
	connect.output()
	disconnect.output()
})


function getLifeMembers(node: ts.ClassDeclaration) {
	let members: {
		member: ts.ClassElement
		deco: ts.Decorator | null
		decoName: string | null
	}[] = []

	for (let member of  node.members) {
		if (!ts.isMethodDeclaration(member)
			&& !ts.isPropertyDeclaration(member)
			&& !ts.isGetAccessorDeclaration(member)
		) {
			continue
		}

		let deco = helper.deco.getFirst(member)
		if (deco) {
			let decoName = helper.deco.getName(deco)
			if (decoName && ['computed', 'asyncComputed', 'effect', 'watch', 'watchMulti', 'useContext', 'setContext'].includes(decoName)) {
				members.push({
					member,
					deco,
					decoName,
				})
			}
		}

		// `prop = new Connectable(...)`
		else if (ts.isPropertyDeclaration(member)
			&& member.initializer
			&& ts.isNewExpression(member.initializer)
		) {
			let classRef = member.initializer.expression
			let classDecl = helper.symbol.resolveDeclaration(classRef, ts.isClassLike)

			if (classDecl && helper.class.isImplementedOf(classDecl, 'Connectable', 'lupos')) {
				members.push({
					member,
					deco: null,
					decoName: null,
				})
			}
		}
	}

	return members
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
	decl: ts.MethodDeclaration | ts.GetAccessorDeclaration | ts.PropertyDeclaration,
	create: MethodOverwrite,
	connect: MethodOverwrite,
	disconnect: MethodOverwrite
) {
	let methodName = helper.getFullText(decl.name)
	let superCls = helper.class.getSuper(decl.parent as ts.ClassDeclaration)
	let isOverwritten = !!superCls && !!helper.objectLike.getMember(superCls, methodName, true)

	if (isOverwritten) {
		return
	}

	let processorClassName = ProcessorClassNameMap[decoName]
	let processorPropName = '$' + methodName + '_' + ProcessorPropNameMap[decoName]
	let makerParameters = makeMakerParameters(deco, decoName, decl)

	Modifier.addImport(processorClassName, 'lupos')

	// Embedded into a callback so it can add tracking codes.
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

	create.insert(() => [createStatementGetter()], 'end')


	// this.$prop_computer.connect()
	let connectStatement = factory.createExpressionStatement(factory.createCallExpression(
		Packer.createAccessNode(
			Packer.createAccessNode(factory.createThis(), processorPropName),
			'connect'
		),
		undefined,
		[]
	))

	connect.insert(() => [connectStatement], 'end')
	

	// this.$prop_computer.disconnect()
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


function makeMakerParameters(
	deco: ts.Decorator,
	decoName: string,
	decl: ts.MethodDeclaration | ts.GetAccessorDeclaration | ts.PropertyDeclaration
): () => ts.Expression[] {
	let methodName = helper.getFullText(decl.name)

	return () => {
		if (decoName === 'computed' || decoName === 'asyncComputed') {
			let params: ts.Expression[] = [
				factory.createPropertyAccessExpression(
					factory.createThis(),
					factory.createIdentifier('$compute_' + methodName)
				),
				factory.createPropertyAccessExpression(
					factory.createThis(),
					factory.createIdentifier('$reset_' + methodName)
				),
				factory.createThis(),
			]

			if (decoName === 'asyncComputed'
				&& ts.isCallExpression(deco.expression)
				&& deco.expression.arguments.length > 1
			) {
				params.push(deco.expression.arguments[1])
			}

			return params
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
		else {
			let watchGetters = compileWatchGetters(deco, decoName)
			let watchOptions = getWatchOptions(deco)

			if (decoName === 'watch') {
				return [
					watchGetters()[0],
					factory.createPropertyAccessExpression(
						factory.createThis(),
						factory.createIdentifier(methodName)
					),
					factory.createThis(),
					...(watchOptions ? [watchOptions] : [])
				]
			}
			else if (decoName === 'watchMulti') {
				return [
					factory.createArrayLiteralExpression(watchGetters(), true),
					factory.createPropertyAccessExpression(
						factory.createThis(),
						factory.createIdentifier(methodName)
					),
					factory.createThis(),
					...(watchOptions ? [watchOptions] : [])
				]
			}
			else {
				return []
			}
		}
	}
}


/** Compile `@watch(...)` and `@watchMulti(...)` to new WatchMultipleMaker([...]). */
function compileWatchGetters(deco: ts.Decorator, decoName: string): () => ts.Expression[] {
	if (!ts.isCallExpression(deco.expression)) {
		return () => []
	}

	let decoArgs: ts.Expression[] = []
	if (decoName === 'watch') {
		if (deco.expression.arguments.length > 0) {
			decoArgs.push(deco.expression.arguments[0])
		}
		else {
			decoArgs.push(factory.createIdentifier('undefined'))
		}
	}
	else {
		if (deco.expression.arguments.length > 0
			&& ts.isArrayLiteralExpression(deco.expression.arguments[0])
		) {
			decoArgs.push(...deco.expression.arguments[0].elements)
		}
	}

	if (decoArgs.some(arg => ts.isStringLiteral(arg))) {
		Modifier.addImport('trackGet', 'lupos')
	}

	return () => {
		let getters: ts.Expression[] = []

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
						true
					)
				))
			}

			// function(){...}
			else if (ts.isFunctionExpression(arg)) {
				let getter = Interpolator.outputChildren(arg) as ts.FunctionExpression
				getters.push(getter)
			}

			// function(){return undefined}
			else {
				getters.push(arg)
			}
		}

		return getters
	}
}


/** Get options parameter of `@watch(..., options)` and `@watchMulti(..., options)`. */
function getWatchOptions(deco: ts.Decorator): ts.Expression | undefined {
	if (!ts.isCallExpression(deco.expression)) {
		return undefined
	}

	if (deco.expression.arguments.length > 1) {
		return deco.expression.arguments[1]
	}

	return undefined
}


/*
```ts
Compile `prop = new Connectable()` to:

onCreated() {
	this.prop.onCreated()
}

onConnected() {
	this.prop.onConnected()
}

onWillDisconnect() {
	this.prop.onWillDisconnect()
}
```
*/
function compileConnectableProperty(
	decl: ts.PropertyDeclaration,
	create: MethodOverwrite,
	connect: MethodOverwrite,
	disconnect: MethodOverwrite
) {
	let propName = helper.getFullText(decl.name)


	// this.prop.onCreated()
	let createStatement = factory.createExpressionStatement(factory.createCallExpression(
		Packer.createAccessNode(
			Packer.createAccessNode(factory.createThis(), propName),
			'onCreated'
		),
		undefined,
		[]
	))

	create.insert(() => [createStatement], 'end')


	// this.prop.onConnected()
	let connectStatement = factory.createExpressionStatement(factory.createCallExpression(
		Packer.createAccessNode(
			Packer.createAccessNode(factory.createThis(), propName),
			'onConnected'
		),
		undefined,
		[]
	))

	connect.insert(() => [connectStatement], 'end')
	

	// this.prop.onWillDisconnect()
	let disconnectStatement = factory.createExpressionStatement(factory.createCallExpression(
		Packer.createAccessNode(
			Packer.createAccessNode(factory.createThis(), propName),
			'onWillDisconnect'
		),
		undefined,
		[]
	))
	
	disconnect.insert(() => [disconnectStatement], 'end')
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
	Modifier.addImport('Component', 'lupos.html')

	let propName = helper.getFullText(propDecl.name)

	let connectStatement = factory.createExpressionStatement(factory.createCallExpression(
		factory.createPropertyAccessExpression(
			factory.createIdentifier('Component'),
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
				factory.createIdentifier('Component'),
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
	Modifier.addImport('Component', 'lupos.html')

	let propName = helper.getFullText(propDecl.name)

	let connectStatement = factory.createExpressionStatement(factory.createBinaryExpression(
		factory.createPropertyAccessExpression(
			factory.createThis(),
			factory.createIdentifier('$' + propName + '_declared_by')
		),
		factory.createToken(ts.SyntaxKind.EqualsToken),
		factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier('Component'),
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
				factory.createIdentifier('undefined')
			))
		]
		  
		if (!hasDeletedContextVariables) {
			disconnectStatements.push(
				factory.createExpressionStatement(factory.createCallExpression(
					factory.createPropertyAccessExpression(
						factory.createIdentifier('Component'),
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
