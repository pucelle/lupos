import * as ts from 'typescript'
import {defineVisitor, Modifier, factory, Interpolator, InterpolationContentType, VisitTree, helper} from '../core'
import {ProcessorPropNameMap} from './decorators-shared'


defineVisitor(function(node: ts.Node, index: number) {
		
	// Method or getter and decorated.
	if (!ts.isMethodDeclaration(node) && !ts.isGetAccessorDeclaration(node)) {
		return
	}

	let decorator = helper.deco.getFirst(node)!
	if (!decorator) {
		return
	}

	let decoName = helper.deco.getName(decorator)
	if (!decoName || !['computed', 'effect', 'watch'].includes(decoName)) {
		return
	}

	let memberName = helper.getFullText(node.name)
	let superCls = helper.class.getSuper(node.parent as ts.ClassDeclaration)
	let isOverwritten = !!superCls && !!helper.class.getMember(superCls, memberName, true)

	Modifier.removeImportOf(decorator)
	let replace: () => ts.Node[]

	replace = compileComputedEffectWatchDecorator(decoName, node as ts.GetAccessorDeclaration, isOverwritten)
	Interpolator.replace(index, InterpolationContentType.Normal, replace)
})



/*
```ts
Compile `@computed prop(){...}` to:

onCreated() {
	this.$prop_computer = new ComputedMaker(this.$compute_prop, this)
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
function compileComputedEffectWatchDecorator(
	decoName: string,
	decl: ts.GetAccessorDeclaration | ts.MethodDeclaration,
	isOverwritten: boolean
): () => ts.Node[] {
	let propName = helper.getFullText(decl.name)
	let processorPropName = '$' + propName + '_' + ProcessorPropNameMap[decoName]
	let overwrittenMethodName = decoName === 'computed' ? '$compute_' + propName : propName

	return () => {
		let newBody = Interpolator.outputChildren(VisitTree.getIndex(decl.body!)) as ts.Block

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

		let getter = decoName === 'computed' ? [
			factory.createGetAccessorDeclaration(
				undefined,
				factory.createIdentifier(propName),
				[],
				undefined,
				factory.createBlock(
					[factory.createReturnStatement(factory.createCallExpression(
						factory.createPropertyAccessExpression(
							factory.createPropertyAccessExpression(
								factory.createThis(),
								factory.createIdentifier(processorPropName)
							),
							factory.createIdentifier('get')
						),
						undefined,
						[]
					))],
					true
				)
			)
		] : []

		if (isOverwritten) {
			return [newMethod]
		}
		else {
			return [
				property,
				newMethod,
				...getter,
			]
		}
	}
}
