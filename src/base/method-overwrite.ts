import type TS from 'typescript'
import {ts, Helper, factory, Interpolator, VisitTree, InterpolationContentType} from '.'


export type MethodInsertPosition = 'before-super' | 'after-super' | 'end'

export class MethodOverwrite {

	readonly classNode: TS.ClassDeclaration
	readonly name: string

	private rawNode: TS.ConstructorDeclaration | TS.MethodDeclaration | null
	private newNode: TS.ConstructorDeclaration | TS.MethodDeclaration | null = null
	private superIndex: number = 0
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

		if (this.rawNode) {
			this.superIndex = this.rawNode!.body!.statements.findIndex(s => {
				Helper.getFullText(s).startsWith('super')
			})
		}
		else {
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
	add(statements: TS.Statement[], position: MethodInsertPosition) {
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

	private addToRaw(statements: TS.Statement[], position: MethodInsertPosition) {
		let blockIndex = VisitTree.getIndex(this.rawNode!.body!)

		if (position === 'end') {
			Interpolator.append(blockIndex, InterpolationContentType.Normal, () => statements)
		}
		else {
			let superCall = this.rawNode!.body!.statements[this.superIndex]

			if (superCall) {
				let superCallIndex = VisitTree.getIndex(superCall)

				if (position === 'before-super') {
					Interpolator.before(superCallIndex, InterpolationContentType.Normal, () => statements)
				}
				else if (position === 'after-super') {
					Interpolator.after(superCallIndex, InterpolationContentType.Normal, () => statements)
				}
			}
			else {
				Interpolator.prepend(blockIndex, InterpolationContentType.Normal, () => statements)
			}
		}
	}

	private addToNew(statements: TS.Statement[], position: MethodInsertPosition) {
		if (statements.length === 0) {
			return
		}

		let method = this.newNode!
		let newStatements = [...method.body!.statements]

		if (position === 'end') {
			newStatements.push(...statements)
		}
		else if (position === 'before-super') {
			newStatements.splice(this.superIndex, 0, ...statements)
			this.superIndex += statements.length
		}
		else if (position === 'after-super') {
			newStatements.splice(this.superIndex + 1, 0, ...statements)
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

