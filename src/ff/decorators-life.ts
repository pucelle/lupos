import type TS from 'typescript'
import {ts, defineVisitor, Modifier, Helper, factory, Interpolator, VisitTree, InterpolationContentType} from '../base'


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

		if (['computed', 'effect', 'watch', 'immediateWatch'].includes(decoName)
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
		if (decoName && ['computed', 'effect', 'watch', 'immediateWatch', 'useContext', 'setContext'].includes(decoName)) {
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

onWillDisconnect() {
	untrack(this.#enqueue_effectFn, this)
}
```

or

```ts
Compile `@watch('prop' / function(){...}) onWatchChange(){...}` to:

onConnected() {
	this.#enqueue_onWatchChange()
}

onWillDisconnect() {
	untrack(this.#enqueue_onWatchChange, this)
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
	let connectCallName = decoName === 'computed' ? '#reset_' + methodName
		: decoName === 'effect'
		? methodName
		: '#compare_' + methodName
		
	let disconnectCallName = decoName === 'computed' ? '#reset_' + methodName : '#enqueue_' + methodName

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
					factory.createPrivateIdentifier(disconnectCallName)
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
	this.#prop_declared = Component.getContextVariableDeclared(this, 'prop')
}

onWillDisconnect() {
	super.onWillDisconnect()
	this.#prop_declared_by = undefined
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
				factory.createPrivateIdentifier('#' + propName + '_declared_by')
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
						factory.createPrivateIdentifier('#' + propName + '_declared_by')
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


type InsertPosition = 'after-super' | 'end'

class MethodOverwrite {

	readonly classNode: TS.ClassDeclaration
	readonly name: string

	private rawNode: TS.ConstructorDeclaration | TS.MethodDeclaration | null
	private newNode: TS.ConstructorDeclaration | TS.MethodDeclaration | null = null
	private inserted: boolean = false

	constructor(classNode: TS.ClassDeclaration, name: string) {
		this.classNode = classNode
		this.name = name

		if (name === 'constructor') {
			this.rawNode = Helper.cls.getConstructor(classNode) ?? null
		}
		else {
			this.rawNode = Helper.cls.getMethod(classNode, name) ?? null
		}

		if (!this.rawNode) {
			if (name === 'constructor') {
				this.newNode = this.createConstructor()
			}
			else {
				this.newNode = this.createMethod()
			}
		}
	}

	/** Create a constructor function. */
	private createConstructor(): TS.ConstructorDeclaration {
		let parameters = Helper.cls.getConstructorParameters(this.classNode) ?? []
		let statements: TS.Statement[] = []
		let superCls = Helper.cls.getSuper(this.classNode)

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
			parameters,
			factory.createBlock(
				statements,
				true
			)
		) 
	}

	/** Create a method, which will call super method without parameters. */
	private createMethod(): TS.MethodDeclaration {
		return factory.createMethodDeclaration(
			undefined,
			undefined,
			factory.createIdentifier(this.name),
			undefined,
			undefined,
			[],
			undefined,
			factory.createBlock(
				[
					factory.createExpressionStatement(factory.createCallExpression(
						factory.createPropertyAccessExpression(
							factory.createSuper(),
							factory.createIdentifier(this.name)
						),
						undefined,
						[]
					)),
				],
				true
			)
		)
	}

	/** Add a list of statements to a method content end. */
	add(statements: TS.Statement[], position: InsertPosition) {
		if (statements.length === 0) {
			return
		}

		if (this.rawNode) {
			this.addToRaw(statements, position)
		}
		else {
			this.addToNew(statements, position)
		}

		this.inserted = true
	}

	private addToRaw(statements: TS.Statement[], position: InsertPosition) {
		let blockIndex = VisitTree.getIndex(this.rawNode!.body!)

		if (position === 'end') {
			Interpolator.append(blockIndex, InterpolationContentType.Normal, () => statements)
		}
		else if (position === 'after-super') {
			let superCall = this.rawNode!.body!.statements.find(s => {
				Helper.getFullText(s).startsWith('super')
			})

			if (superCall) {
				let superCallIndex = VisitTree.getIndex(superCall)
				Interpolator.after(superCallIndex, InterpolationContentType.Normal, () => statements)
			}
			else {
				Interpolator.prepend(blockIndex, InterpolationContentType.Normal, () => statements)
			}
		}
	}

	private addToNew(statements: TS.Statement[], position: InsertPosition) {
		let method = this.newNode!
		let newStatements = [...method.body!.statements] || []

		if (position === 'end') {
			newStatements.push(...statements)
		}
		else if (position === 'after-super') {
			if (newStatements.length > 0
				&& Helper.getFullText(newStatements[0]).startsWith('super')
			) {
				newStatements.splice(1, 0, ...statements)
			}
		}

		if (ts.isConstructorDeclaration(method)) {
			this.newNode = factory.updateConstructorDeclaration(
				method,
				method.modifiers,
				method.parameters,
				factory.createBlock(newStatements, true)
			)
		}
		else {
			this.newNode = factory.updateMethodDeclaration(
				method,
				method.modifiers,
				method.asteriskToken,
				method.name,
				method.questionToken,
				method.typeParameters,
				method.parameters,
				method.type,
				factory.createBlock(newStatements, true)
			)
		}
	}

	output() {
		if (!this.newNode || !this.inserted) {
			return
		}

		let classIndex = VisitTree.getIndex(this.classNode)

		let firstNonStaticMethod = this.classNode.members.find(member => {
			if (!ts.isMethodDeclaration(member)) {
				return null
			}

			let hasStatic = member.modifiers?.find((n: TS.ModifierLike) => n.kind === ts.SyntaxKind.StaticKeyword)
			if (hasStatic) {
				return null
			}

			return member
		})

		if (firstNonStaticMethod) {
			let firstNonStaticMethodIndex = VisitTree.getIndex(firstNonStaticMethod)
			Interpolator.before(firstNonStaticMethodIndex, InterpolationContentType.Normal, () => this.newNode!)
		}
		else {
			Interpolator.append(classIndex, InterpolationContentType.Normal, () => this.newNode!)
		}
	}
}

