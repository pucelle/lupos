import ts from 'typescript'
import {Modifier, Interpolator, InterpolationContentType, transformContext} from '../../core'
import {
	DecoratedMemberAnalysis,
	ObservableDecoratorName,
	ProcessorPropNameMap,
} from './decorators'


/** Compile a observable decorator. */
export function compileObservableDecorator(analysis: DecoratedMemberAnalysis) {
	let {decorator, decoratorName, member, isOverwritten} = analysis
	let replace: () => ts.Node[]

	Modifier.removeImportOf(decorator)

	if (decoratorName === 'computed') {
		replace = compileComputedDecorator(decoratorName, member as ts.GetAccessorDeclaration, isOverwritten)
	}
	else if (decoratorName === 'asyncComputed') {
		replace = compileAsyncComputedDecorator(decoratorName, decorator, member as ts.PropertyDeclaration, isOverwritten)
	}
	else {
		replace = compileEffectWatchDecorator(member as ts.MethodDeclaration)
	}

	Interpolator.replace(member, InterpolationContentType.Normal, replace)
}



/*
```ts
Compile `@computed prop(){...}` to:

onCreated() {
	this.$prop_computer = new Computed(this.$compute_prop, this.$reset_prop, this)
}

onConnected() {
	this.$prop_computer.connect()
}

onWillDisconnect() {
	this.$prop_computer.disconnect()
}

$prop_computer = undefined

$compute_prop() {...}
```
*/
function compileComputedDecorator(
	decoName: ObservableDecoratorName,
	decl: ts.GetAccessorDeclaration,
	isOverwritten: boolean
): () => ts.Node[] {
	let propName = transformContext.helper.getFullText(decl.name)
	let processorPropName = '$' + propName + '_' + ProcessorPropNameMap[decoName]
	let overwrittenMethodName = '$compute_' + propName
	let resetMethodName = '$reset_' + propName

	Modifier.addImport('trackGet', 'lupos')
	Modifier.addImport('trackSet', 'lupos')

	return () => {
		let newBody = Interpolator.outputChildren(decl.body!) as ts.Block

		let modifiers = decl.modifiers?.filter(m => !ts.isDecorator(m))

		// `$compute_xxx() {...}`
		let newMethod = transformContext.factory.createMethodDeclaration(
			modifiers,
			undefined,
			transformContext.factory.createIdentifier(overwrittenMethodName),
			undefined,
			undefined,
			decl.parameters,
			undefined,
			newBody
		)

		// `trackGet(this, 'prop')`
		// `return this.$prop_computer.get()`
		let getter = transformContext.factory.createGetAccessorDeclaration(
			undefined,
			transformContext.factory.createIdentifier(propName),
			[],
			undefined,
			transformContext.factory.createBlock(
				[
					transformContext.factory.createExpressionStatement(transformContext.factory.createCallExpression(
						transformContext.factory.createIdentifier('trackGet'),
						undefined,
						[
							transformContext.factory.createThis(),
							transformContext.factory.createStringLiteral(propName)
						]
					)),
					transformContext.factory.createReturnStatement(transformContext.factory.createCallExpression(
						transformContext.factory.createPropertyAccessExpression(
							transformContext.factory.createPropertyAccessExpression(
								transformContext.factory.createThis(),
								transformContext.factory.createIdentifier(processorPropName)
							),
							transformContext.factory.createIdentifier('get')
						),
						undefined,
						[]
					))
				],
				true
			)
		)

		let onReset = transformContext.factory.createMethodDeclaration(
			undefined,
			undefined,
			transformContext.factory.createIdentifier(resetMethodName),
			undefined,
			undefined,
			[],
			undefined,
			transformContext.factory.createBlock(
				[transformContext.factory.createExpressionStatement(transformContext.factory.createCallExpression(
					transformContext.factory.createIdentifier('trackSet'),
					undefined,
					[
						transformContext.factory.createThis(),
						transformContext.factory.createStringLiteral(propName)
					]
				))],
				true
			)
		)
		  

		if (isOverwritten) {
			return [newMethod]
		}
		else {
			return [
				newMethod,
				getter,
				onReset,
			]
		}
	}
}


/*
```ts
Compile `@asyncComputed prop(){...}` to:

onCreated() {
	this.$prop_asyncComputer = new AsyncComputed(this.$compute_prop, this.$reset_prop, this)
}

onConnected() {
	this.$prop_asyncComputer.connect()
}

onWillDisconnect() {
	this.$prop_asyncComputer.disconnect()
}

$prop_asyncComputer = undefined

$compute_prop() {...}
```
*/
function compileAsyncComputedDecorator(
	decoName: ObservableDecoratorName,
	deco: ts.Decorator,
	decl: ts.PropertyDeclaration,
	isOverwritten: boolean
): () => ts.Node[] {
	let propName = transformContext.helper.getFullText(decl.name)
	let processorPropName = '$' + propName + '_' + ProcessorPropNameMap[decoName]
	let overwrittenMethodName = '$compute_' + propName
	let resetMethodName = '$reset_' + propName

	Modifier.addImport('trackGet', 'lupos')
	Modifier.addImport('trackSet', 'lupos')

	let computer: ts.FunctionDeclaration | ts.FunctionExpression | undefined
	
	if (ts.isCallExpression(deco.expression)
		&& deco.expression.arguments[0]
		&& (
			ts.isFunctionDeclaration(deco.expression.arguments[0])
			|| ts.isFunctionExpression(deco.expression.arguments[0])
		)
	) {
		computer = deco.expression.arguments[0]
	}

	return () => {
		let newBody = computer && computer.body
			? Interpolator.outputChildren(computer.body) as ts.Block
			: undefined

		let modifiers = computer?.modifiers?.filter(m => !ts.isDecorator(m))

		// `$compute_xxx() {...}`
		let newMethod = transformContext.factory.createMethodDeclaration(
			modifiers,
			undefined,
			transformContext.factory.createIdentifier(overwrittenMethodName),
			undefined,
			undefined,
			[],
			undefined,
			newBody
		)

		// `this.$prop_computer.get()`
		let computerGet: ts.Expression = transformContext.factory.createCallExpression(
			transformContext.factory.createPropertyAccessExpression(
				transformContext.factory.createPropertyAccessExpression(
					transformContext.factory.createThis(),
					transformContext.factory.createIdentifier(processorPropName)
				),
				transformContext.factory.createIdentifier('get')
			),
			undefined,
			[]
		)

		// `this.$prop_computer.get() ?? ...`
		if (decl.initializer
			&& !(
				ts.isIdentifier(decl.initializer)
				&& transformContext.helper.getText(decl.initializer) === 'undefined'
			)
		) {
			computerGet = transformContext.factory.createBinaryExpression(
				computerGet,
				transformContext.factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
				decl.initializer
			)
		}

		// `trackGet(this, 'prop')`
		// `return this.$prop_computer.get()`
		let getter = transformContext.factory.createGetAccessorDeclaration(
			undefined,
			transformContext.factory.createIdentifier(propName),
			[],
			undefined,
			transformContext.factory.createBlock(
				[
					transformContext.factory.createExpressionStatement(transformContext.factory.createCallExpression(
						transformContext.factory.createIdentifier('trackGet'),
						undefined,
						[
							transformContext.factory.createThis(),
							transformContext.factory.createStringLiteral(propName)
						]
					)),
					transformContext.factory.createReturnStatement(computerGet)
				],
				true
			)
		)

		let onReset = transformContext.factory.createMethodDeclaration(
			undefined,
			undefined,
			transformContext.factory.createIdentifier(resetMethodName),
			undefined,
			undefined,
			[],
			undefined,
			transformContext.factory.createBlock(
				[transformContext.factory.createExpressionStatement(transformContext.factory.createCallExpression(
					transformContext.factory.createIdentifier('trackSet'),
					undefined,
					[
						transformContext.factory.createThis(),
						transformContext.factory.createStringLiteral(propName)
					]
				))],
				true
			)
		)
		  

		if (isOverwritten) {
			return [newMethod]
		}
		else {
			return [
				newMethod,
				getter,
				onReset,
			]
		}
	}
}


/*
```ts
Compile `@effect method(){...}` to:

onCreated() {
	this.$method_effector = new Effector(this.$compute_method, this)
}

onConnected() {
	this.$method_effector.connect()
}

onWillDisconnect() {
	this.$method_effector.disconnect()
}

method() {...}
```
*/
function compileEffectWatchDecorator(
	decl: ts.MethodDeclaration
): () => ts.Node[] {
	let propName = transformContext.helper.getFullText(decl.name)
	let overwrittenMethodName = propName

	return () => {
		let newBody = Interpolator.outputChildren(decl.body!) as ts.Block

		let modifiers = decl.modifiers?.filter(m => !ts.isDecorator(m))

		let newMethod = transformContext.factory.createMethodDeclaration(
			modifiers,
			undefined,
			transformContext.factory.createIdentifier(overwrittenMethodName),
			undefined,
			undefined,
			decl.parameters,
			undefined,
			newBody
		)

		return [newMethod]
	}
}
