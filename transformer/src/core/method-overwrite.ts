import type TS from 'typescript'
import {Helper} from '../lupos-ts-module'
import {factory, ts} from './global'
import {VisitTree} from './visit-tree'
import {InterpolationContentType, Interpolator} from './interpolator'


export type MethodInsertPosition = 'before-super' | 'after-super' | 'end'

export interface MethodInsertInserted {
	statementsGetter: () => TS.Statement[]
	position: MethodInsertPosition
}

export class MethodOverwrite {

	readonly classNode: TS.ClassDeclaration
	readonly name: string
	readonly rawNode: TS.ConstructorDeclaration | TS.MethodDeclaration | null

	private newNode: TS.ConstructorDeclaration | TS.MethodDeclaration | null = null
	private superIndex: number = 0
	private inserted: MethodInsertInserted[] = []

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
	insert(statementsGetter: () => TS.Statement[], position: MethodInsertPosition) {
		this.inserted.push({statementsGetter, position})
	}

	output() {
		if (this.inserted.length === 0) {
			return
		}

		if (this.rawNode) {
			this.outputToRaw()
		}
		else {
			this.outputToNew()
		}
	}

	private outputToRaw() {
		for (let item of this.inserted) {
			this.outputItemToRaw(item.statementsGetter, item.position)
		}
	}

	private outputItemToRaw(statementsGetter: () => TS.Statement[], position: MethodInsertPosition) {
		let blockIndex = VisitTree.getIndex(this.rawNode!.body!)

		if (position === 'end') {
			Interpolator.append(blockIndex, InterpolationContentType.Normal, statementsGetter)
		}
		else {
			let superCall = this.rawNode!.body!.statements[this.superIndex]

			if (superCall) {
				let superCallIndex = VisitTree.getIndex(superCall)

				if (position === 'before-super') {
					Interpolator.before(superCallIndex, InterpolationContentType.Normal, statementsGetter)
				}
				else if (position === 'after-super') {
					Interpolator.after(superCallIndex, InterpolationContentType.Normal, statementsGetter)
				}
			}
			else {
				Interpolator.prepend(blockIndex, InterpolationContentType.Normal, statementsGetter)
			}
		}
	}

	private outputToNew() {
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
			Interpolator.before(firstNonStaticMethodIndex, InterpolationContentType.Normal, () => this.outputToNewNode())
		}
		else {
			Interpolator.append(classIndex, InterpolationContentType.Normal, () => this.outputToNewNode())
		}
	}

	private outputToNewNode(): TS.Node {
		for (let item of this.inserted) {
			let statements = item.statementsGetter()
			let position = item.position

			this.addStatementsToNew(statements, position)
		}

		return this.newNode!
	}

	private addStatementsToNew(statements: TS.Statement[], position: MethodInsertPosition) {
		if (statements.length === 0) {
			return
		}

		let newNode = this.newNode!
		let newStatements = [...newNode.body!.statements]

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

		if (ts.isConstructorDeclaration(newNode)) {
			this.newNode = factory.updateConstructorDeclaration(
				newNode,
				newNode.modifiers,
				newNode.parameters,
				factory.createBlock(newStatements, true)
			)
		}
		else {
			this.newNode = factory.updateMethodDeclaration(
				newNode,
				newNode.modifiers,
				newNode.asteriskToken,
				newNode.name,
				newNode.questionToken,
				newNode.typeParameters,
				newNode.parameters,
				newNode.type,
				factory.createBlock(newStatements, true)
			)
		}
	}

}

