import * as ts from 'typescript'
import {defineVisitor, Modifier, factory, Interpolator, InterpolationContentType, helper} from '../core'
import {ProcessorPropNameMap} from './decorators-shared'


defineVisitor(function(node: ts.Node) {
		
	// Method or getter and decorated.
	if (!ts.isMethodDeclaration(node) && !ts.isGetAccessorDeclaration(node)) {
		return
	}

	let decorator = helper.deco.getFirst(node)!
	if (!decorator) {
		return
	}

	let decoName = helper.deco.getName(decorator)
	if (!decoName || !['computed', 'effect', 'watch', 'watchMulti'].includes(decoName)) {
		return
	}

	let memberName = helper.getFullText(node.name)
	let superCls = helper.class.getSuper(node.parent as ts.ClassDeclaration)
	let isOverwritten = !!superCls && !!helper.class.getMember(superCls, memberName, true)

	Modifier.removeImportOf(decorator)
	let replace: () => ts.Node[]

	if (decoName === 'computed') {
		replace = compileComputedDecorator(decoName, node as ts.GetAccessorDeclaration, isOverwritten)
	}
	else {
		replace = compileEffectWatchDecorator(decoName, node as ts.MethodDeclaration, isOverwritten)
	}

	Interpolator.replace(node, InterpolationContentType.Normal, replace)
})



/*
```ts
Compile `@computed prop(){...}` to:

onCreated() {
	this.$prop_computer = new ComputedMaker(this.$compute_prop, this.$reset_prop, this)
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
	decoName: string,
	decl: ts.GetAccessorDeclaration,
	isOverwritten: boolean
): () => ts.Node[] {
	let propName = helper.getFullText(decl.name)
	let processorPropName = '$' + propName + '_' + ProcessorPropNameMap[decoName]
	let overwrittenMethodName = '$compute_' + propName
	let resetMethodName = '$reset_' + propName

	Modifier.addImport('trackGet', '@pucelle/ff')
	Modifier.addImport('trackSet', '@pucelle/ff')

	return () => {
		let newBody = Interpolator.outputChildren(decl.body!) as ts.Block

		let property = factory.createPropertyDeclaration(
			undefined,
			factory.createIdentifier(processorPropName),
			undefined,
			undefined,
			factory.createIdentifier('undefined')
		)

		let modifiers = decl.modifiers?.filter(m => !ts.isDecorator(m))

		let newMethod = factory.createMethodDeclaration(
			modifiers,
			undefined,
			factory.createIdentifier(overwrittenMethodName),
			undefined,
			undefined,
			decl.parameters,
			undefined,
			newBody
		)

		// `trackGet(this, 'prop')`
		// `return this.$prop_computer.get()`
		let getter = factory.createGetAccessorDeclaration(
			undefined,
			factory.createIdentifier(propName),
			[],
			undefined,
			factory.createBlock(
				[
					factory.createExpressionStatement(factory.createCallExpression(
						factory.createIdentifier('trackGet'),
						undefined,
						[
							factory.createThis(),
							factory.createStringLiteral(propName)
						]
					)),
					factory.createReturnStatement(factory.createCallExpression(
						factory.createPropertyAccessExpression(
							factory.createPropertyAccessExpression(
								factory.createThis(),
								factory.createIdentifier(processorPropName)
							),
							factory.createIdentifier('get')
						),
						undefined,
						[]
					))
				],
				true
			)
		)

		let onReset = factory.createMethodDeclaration(
			undefined,
			undefined,
			factory.createIdentifier(resetMethodName),
			undefined,
			undefined,
			[],
			undefined,
			factory.createBlock(
				[factory.createExpressionStatement(factory.createCallExpression(
					factory.createIdentifier('trackSet'),
					undefined,
					[
						factory.createThis(),
						factory.createStringLiteral(propName)
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
				property,
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
	this.$method_effector = new EffectMaker(this.$compute_method, this)
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
	decoName: string,
	decl: ts.MethodDeclaration,
	isOverwritten: boolean
): () => ts.Node[] {
	let propName = helper.getFullText(decl.name)
	let processorPropName = '$' + propName + '_' + ProcessorPropNameMap[decoName]
	let overwrittenMethodName = propName

	return () => {
		let newBody = Interpolator.outputChildren(decl.body!) as ts.Block

		let property = factory.createPropertyDeclaration(
			undefined,
			factory.createIdentifier(processorPropName),
			undefined,
			undefined,
			factory.createIdentifier('undefined')
		)

		let modifiers = decl.modifiers?.filter(m => !ts.isDecorator(m))

		let newMethod = factory.createMethodDeclaration(
			modifiers,
			undefined,
			factory.createIdentifier(overwrittenMethodName),
			undefined,
			undefined,
			decl.parameters,
			undefined,
			newBody
		)

		if (isOverwritten) {
			return [newMethod]
		}
		else {
			return [
				property,
				newMethod,
			]
		}
	}
}