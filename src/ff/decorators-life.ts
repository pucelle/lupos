import type TS from 'typescript'
import {ts, defineVisitor, modifier, helper, factory} from '../base'


defineVisitor(

	// Add some decorator compiled part to `constructor` or `onConnected` and `onDisconnected`.
	(node: TS.Node) => {
		if (!ts.isClassDeclaration(node)) {
			return false
		}

		return true
	},
	(node: TS.ClassDeclaration) => {
		let members = node.members
		let hasMembers = hasEffectOrWatchDecorator(node)

		if (hasMembers) {
			let connect: TS.MethodDeclaration | TS.ConstructorDeclaration | undefined = undefined
			let disconnect: TS.MethodDeclaration | undefined = undefined

			// Be a component.
			if (helper.isDerivedClassOf(node, 'Component', '@pucelle/lupos.js')) {
				connect = helper.getClassMethod(node, 'onConnected')
				if (!connect) {
					connect = createCallSuperMethod('onConnected')
				}

				disconnect = helper.getClassMethod(node, 'onDisconnected')
				if (!disconnect) {
					disconnect = createCallSuperMethod('onDisconnected')
				}
			}
			else {
				connect = helper.getConstructor(node)
				if (!connect) {
					connect = createConstructor(node)
				}
			}

			for (let member of members) {
				if (!ts.isMethodDeclaration(member)) {
					continue
				}

				let decoName = helper.getFirstDecoratorName(member)
				if (!decoName || !['effect', 'watch'].includes(decoName)) {
					continue
				}

				[connect, disconnect] = compileEffectOrWatchDecorator(member, connect, disconnect)
			}

			let newMembers = [connect, disconnect].filter(v => v) as TS.ClassElement[]
			node = modifier.replaceClassMembers(node, newMembers, true)
		}

		return node
	},
)


function hasEffectOrWatchDecorator(node: TS.ClassDeclaration) {
	return node.members.some(member => {
		if (!ts.isMethodDeclaration(member)) {
			return false
		}

		let decoName = helper.getFirstDecoratorName(member)
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
	let parameters = helper.getConstructorParameters(node)
	let statements: TS.Statement[] = []

	if (parameters) {
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