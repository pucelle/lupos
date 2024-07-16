import type TS from 'typescript'
import {ts, defineVisitor, modifier, helper, factory} from '../base'


// Add some decorator compiled part to `constructor` or `onConnected` and `onDisconnected`.
defineVisitor(function(node: TS.Node, index: number) {
	if (!ts.isClassDeclaration(node)) {
		return
	}

	let hasNeedToCompileMembers = hasEffectOrWatchDecorator(node)
	if (!hasNeedToCompileMembers) {
		return
	}

	let connect: TS.MethodDeclaration | TS.ConstructorDeclaration | undefined = undefined
	let disconnect: TS.MethodDeclaration | undefined = undefined

	// Be a component.
	if (helper.cls.isDerivedOf(node, 'Component', '@pucelle/lupos.js')) {
		connect = helper.cls.getMethod(node, 'onConnected')
		if (!connect) {
			connect = createCallSuperMethod('onConnected')
		}

		disconnect = helper.cls.getMethod(node, 'onDisconnected')
		if (!disconnect) {
			disconnect = createCallSuperMethod('onDisconnected')
		}
	}
	else {
		connect = helper.cls.getConstructor(node)
		if (!connect) {
			connect = createConstructor(node)
		}
	}

	for (let member of node.members) {
		if (!ts.isMethodDeclaration(member)) {
			continue
		}

		let decoName = helper.deco.getFirstName(member)
		if (!decoName || !['effect', 'watch'].includes(decoName)) {
			continue
		}

		[connect, disconnect] = compileEffectOrWatchDecorator(member, connect, disconnect)
	}

	for (let member of [connect, disconnect]) {
		if (!member) {
			continue
		}

		modifier.addClassMember(index, member, true)
	}
})


function hasEffectOrWatchDecorator(node: TS.ClassDeclaration) {
	return node.members.some(member => {
		if (!ts.isMethodDeclaration(member)) {
			return false
		}

		let decoName = helper.deco.getFirstName(member)
		if (decoName && ['effect', 'watch'].includes(decoName)) {
			return true
		}

		return false
	})
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
```

or

```ts
Compile `@watch('prop' / function(){...}) onWatchChange(){...}` to:

onConnected() {
	this.#enqueue_onWatchChange()
}

onDisconnected() {
	untrack(this.#enqueue_onWatchChange, this)
}

```
*/
function compileEffectOrWatchDecorator(
	methodDecl: TS.MethodDeclaration,
	connect: TS.MethodDeclaration | TS.ConstructorDeclaration,
	disconnect: TS.MethodDeclaration | undefined
): [TS.MethodDeclaration | TS.ConstructorDeclaration, TS.MethodDeclaration | undefined] {
	let methodName = helper.getText(methodDecl.name)

	if (connect) {
		let connectStatement = factory.createExpressionStatement(factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createThis(),
				factory.createPrivateIdentifier('#enqueue_' + methodName)
			),
			undefined,
			[]
		))

		connect = addToMethodDeclaration(connect, [connectStatement])
	}
	
	if (disconnect) {
		let disconnectStatement = factory.createExpressionStatement(factory.createCallExpression(
			factory.createIdentifier('untrack'),
			undefined,
			[
				factory.createPropertyAccessExpression(
					factory.createThis(),
					factory.createPrivateIdentifier('#enqueue_' + methodName)
				),
				factory.createThis()
			]
		))
		
		disconnect = addToMethodDeclaration(disconnect, [disconnectStatement])
		modifier.addImport('untrack', '@pucelle/ff')
	}

	return [connect, disconnect]
}


/** Create a method, which will call super method without parameters. */
function createCallSuperMethod(name: string): TS.MethodDeclaration {
	return factory.createMethodDeclaration(
		undefined,
		undefined,
		factory.createIdentifier(name),
		undefined,
		undefined,
		[],
		undefined,
		factory.createBlock(
			[
				factory.createExpressionStatement(factory.createCallExpression(
					factory.createPropertyAccessExpression(
						factory.createSuper(),
						factory.createIdentifier(name)
					),
					undefined,
					[]
				)),
			],
			true
		)
	)
}


/** Create a constructor function. */
function createConstructor(node: TS.ClassDeclaration): TS.ConstructorDeclaration {
	let parameters = helper.cls.getConstructorParameters(node)
	let statements: TS.Statement[] = []
	let superCls = helper.cls.getSuper(node)

	if (superCls) {
		let callSuper = factory.createExpressionStatement(factory.createCallExpression(
			factory.createSuper(),
			undefined,
			parameters.map(p => p.name as TS.Identifier)
		))

		statements = [callSuper]
	}

	return factory.createConstructorDeclaration(
		undefined,
		parameters || [],
		factory.createBlock(
			statements,
			true
		)
	) 
}


/** Add a list of statements to a method content end. */
function addToMethodDeclaration<T extends TS.MethodDeclaration | TS.ConstructorDeclaration>(method: T, statements: TS.Statement[]): T {
	if (ts.isMethodDeclaration(method)) {
		return factory.updateMethodDeclaration(
			method,
			method.modifiers,
			method.asteriskToken,
			method.name,
			method.questionToken,
			method.typeParameters,
			method.parameters,
			method.type,
			factory.createBlock([
				...(method.body?.statements || []),
				...statements,
			], true)
		) as T
	}
	else {
		return factory.updateConstructorDeclaration(
			method,
			method.modifiers,
			method.parameters,
			factory.createBlock([
				...(method.body?.statements || []),
				...statements,
			], true)
		) as T
	}
}