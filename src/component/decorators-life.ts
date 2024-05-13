import type * as ts from 'typescript'
import {SourceFileModifier, TSHelper, defineVisitor, isComponent, isObservable} from '../base'


defineVisitor(

	// Add some decorator compiled part to `constructor` or `onConnected` and `onDisconnected`.
	(node: ts.Node, helper: TSHelper) => {
		if (!helper.ts.isClassDeclaration(node)) {
			return false
		}

		if (!isObservable()) {
			return false
		}

		return true
	},
	(node: ts.ClassDeclaration, helper: TSHelper, modifier: SourceFileModifier) => {
		let members = node.members
		let hasMembers = hasEffectOrWatchDecorator(node, helper)

		if (hasMembers) {
			let connect: ts.MethodDeclaration | ts.ConstructorDeclaration | undefined = undefined
			let disconnect: ts.MethodDeclaration | undefined = undefined

			if (isComponent()) {
				connect = helper.getClassMethod(node, 'onConnected')
				if (!connect) {
					connect = createCallSuperMethod('onConnected', helper)
				}

				disconnect = helper.getClassMethod(node, 'onDisconnected')
				if (!disconnect) {
					disconnect = createCallSuperMethod('onDisconnected', helper)
				}
			}
			else {
				connect = helper.getConstructor(node)
				if (!connect) {
					connect = createConstructor(node, helper)
				}
			}

			for (let member of members) {
				if (!helper.ts.isMethodDeclaration(member)) {
					continue
				}

				let decorator = helper.getFirstDecorator(member)
				let decName = decorator ? helper.getDecoratorName(decorator) : undefined
				if (!decName || !['effect', 'watch'].includes(decName)) {
					continue
				}

				[connect, disconnect] = compileEffectOrWatchDecorator(member, connect, disconnect, helper, modifier)
			}

			let newMembers = [connect, disconnect].filter(v => v) as ts.ClassElement[]
			node = modifier.replaceClassMembers(node, newMembers, true)
		}

		node = modifier.removeClassDecorator(node, 'observable')

		return node
	},
)


function hasEffectOrWatchDecorator(node: ts.ClassDeclaration, helper: TSHelper) {
	return node.members.some(member => {
		if (!helper.ts.isMethodDeclaration(member)) {
			return false
		}

		let decorator = helper.getFirstDecorator(member)
		let decName = decorator ? helper.getDecoratorName(decorator) : undefined

		if (decName && ['effect', 'watch'].includes(decName)) {
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
	methodDecl: ts.MethodDeclaration,
	connect: ts.MethodDeclaration | ts.ConstructorDeclaration,
	disconnect: ts.MethodDeclaration | undefined,
	helper: TSHelper, modifier: SourceFileModifier
): [ts.MethodDeclaration | ts.ConstructorDeclaration, ts.MethodDeclaration | undefined] {
	let factory = helper.ts.factory
	let methodName = methodDecl.name.getText()

	if (connect) {
		let connectStatement = factory.createExpressionStatement(factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createThis(),
				factory.createPrivateIdentifier('#enqueue_' + methodName)
			),
			undefined,
			[]
		))

		connect = addToMethodDeclaration(connect, [connectStatement], helper)
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
		
		disconnect = addToMethodDeclaration(disconnect, [disconnectStatement], helper)
		modifier.addNamedImport('untrack', '@pucelle/lupos.js')
	}

	return [connect, disconnect]
}


/** Create a method, which will call super method without parameters. */
function createCallSuperMethod(name: string, helper: TSHelper): ts.MethodDeclaration {
	let factory = helper.ts.factory

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
function createConstructor(node: ts.ClassDeclaration, helper: TSHelper): ts.ConstructorDeclaration {
	let factory = helper.ts.factory
	let parameters = helper.getConstructorParameters(node)
	let statements: ts.Statement[] = []

	if (parameters) {
		let callSuper = factory.createExpressionStatement(factory.createCallExpression(
			factory.createSuper(),
			undefined,
			parameters.map(p => p.name as ts.Identifier)
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
function addToMethodDeclaration<T extends ts.MethodDeclaration | ts.ConstructorDeclaration>(method: T, statements: ts.Statement[], helper: TSHelper): T {
	let factory = helper.ts.factory
	
	if (helper.ts.isMethodDeclaration(method)) {
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
			])
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
			])
		) as T
	}
}