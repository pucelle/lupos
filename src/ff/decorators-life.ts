import type TS from 'typescript'
import {ts, defineVisitor, Modifier, Helper, factory, Interpolator, VisitTree, MethodOverwrite} from '../base'


// Add some decorator compiled part to `constructor` or `onConnected` and `onWillDisconnect`.
defineVisitor(function(node: TS.Node, _index: number) {
	if (!ts.isClassDeclaration(node)) {
		return
	}

	let hasNeedToCompileMembers = hasLifeDecorators(node)
	if (!hasNeedToCompileMembers) {
		return
	}

	let connect: MethodOverwrite
	let disconnect: MethodOverwrite | null = null
	let hasDeletedContextVariables = false

	// Be a component.
	if (Helper.cls.isDerivedOf(node, 'Component', '@pucelle/lupos.js')) {
		connect = new MethodOverwrite(node, 'onConnected')
		disconnect = new MethodOverwrite(node, 'onWillDisconnect')
	}
	else {
		connect = new MethodOverwrite(node, 'constructor')
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
			compileComputedEffectWatchDecorator(decoName, member, connect, disconnect)
		}
		else if (decoName === 'setContext' && ts.isPropertyDeclaration(member)) {
			compileSetContextDecorator(member, connect, disconnect, hasDeletedContextVariables)
			Interpolator.remove(VisitTree.getIndex(deco))
			hasDeletedContextVariables = true
		}
		else if (decoName === 'useContext' && ts.isPropertyDeclaration(member)) {
			compileUseContextDecorator(member, connect, disconnect, hasDeletedContextVariables)
			hasDeletedContextVariables = true
		}
	}

	connect.output()
	disconnect?.output()
})


function hasLifeDecorators(node: TS.ClassDeclaration) {
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
	decoName: string,
	decl: TS.MethodDeclaration | TS.GetAccessorDeclaration,
	connect: MethodOverwrite,
	disconnect: MethodOverwrite | null
) {
	let methodName = Helper.getFullText(decl.name)
	let superCls = Helper.cls.getSuper(decl.parent as TS.ClassDeclaration)
	let isOverwritten = !!superCls && !!Helper.cls.getMember(superCls, methodName, true)

	if (isOverwritten) {
		return
	}

	let connectCallName = '$compare_' + methodName
	let disconnectCallName = decoName === 'computed' ? '$reset_' + methodName : '$enqueue_' + methodName

	// No need to reset in constructor function
	let ignoreConnect = connect.name === 'constructor' && decoName === 'computed'

	if (connect && !ignoreConnect) {
		let connectStatement = factory.createExpressionStatement(factory.createCallExpression(
			Helper.createAccessNode(factory.createThis(), connectCallName),
			undefined,
			[]
		))

		let insertAfterSuper = decoName === 'computed'
		connect.add([connectStatement], insertAfterSuper ? 'after-super' : 'end')
	}
	
	if (disconnect) {
		let disconnectStatement = factory.createExpressionStatement(factory.createCallExpression(
			factory.createIdentifier('untrack'),
			undefined,
			[
				factory.createPropertyAccessExpression(
					factory.createThis(),
					factory.createIdentifier(disconnectCallName)
				),
				factory.createThis()
			]
		))
		
		disconnect.add([disconnectStatement], 'end')
		Modifier.addImport('untrack', '@pucelle/ff')
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
	propDecl: TS.PropertyDeclaration,
	connect: MethodOverwrite,
	disconnect: MethodOverwrite | null,
	hasDeletedContextVariables: boolean
) {
	let propName = Helper.getFullText(propDecl.name)
	let extended = Helper.cls.getExtends(propDecl.parent as TS.ClassDeclaration)!
	let classExp = extended.expression
		
	if (connect) {
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
		))

		connect.add([connectStatement], 'end')
	}
	
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
		
		disconnect.add([disconnectStatement], 'end')
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
	propDecl: TS.PropertyDeclaration,
	connect: MethodOverwrite,
	disconnect: MethodOverwrite | null,
	hasDeletedContextVariables: boolean
) {
	let propName = Helper.getFullText(propDecl.name)
	let extended = Helper.cls.getExtends(propDecl.parent as TS.ClassDeclaration)!
	let classExp = extended.expression
	
	if (connect) {
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
		))

		connect.add([connectStatement], 'end')
	}
	
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
		
		disconnect.add(disconnectStatements, 'end')
	}
}
