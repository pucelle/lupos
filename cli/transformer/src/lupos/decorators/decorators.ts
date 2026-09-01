import ts from 'typescript'
import {transformContext} from '../../core'


export const ObservableDecoratorNames = ['computed', 'asyncComputed', 'effect', 'watch', 'watchMulti'] as const
export const ContextDecoratorNames = ['setContext', 'useContext'] as const
export const DecoratorNames = [...ObservableDecoratorNames, ...ContextDecoratorNames] as const

export type ObservableDecoratorName = typeof ObservableDecoratorNames[number]
export type ContextDecoratorName = typeof ContextDecoratorNames[number]
export type DecoratorName = typeof DecoratorNames[number]

export interface DecoratedMemberAnalysis {
	kind: 'decorator'
	member: ts.MethodDeclaration | ts.GetAccessorDeclaration | ts.PropertyDeclaration
	decorator: ts.Decorator
	decoratorName: DecoratorName
	memberName: string
	isOverwritten: boolean
}

export interface ConnectablePropertyAnalysis {
	kind: 'connectable-property'
	member: ts.PropertyDeclaration
}

export type DecoratorMemberAnalysis = DecoratedMemberAnalysis | ConnectablePropertyAnalysis

export interface DecoratorClassAnalysis {
	members: DecoratorMemberAnalysis[]
}


export const ProcessorClassNameMap: Record<ObservableDecoratorName, string> = {
	computed: 'Computed',
	asyncComputed: 'AsyncComputed',
	effect: 'Effector',
	watch: 'Watcher',
	watchMulti: 'MultiWatcher',
}

export const ProcessorPropNameMap: Record<ObservableDecoratorName, string> = {
	computed: 'computer',
	asyncComputed: 'asyncComputer',
	effect: 'effector',
	watch: 'watcher',
	watchMulti: 'multiWatcher',
}


/** Analyze every decorator and connectable property in a class once. */
export function analyzeDecoratorClass(node: ts.ClassDeclaration): DecoratorClassAnalysis {
	let members: DecoratorMemberAnalysis[] = []
	let superClass: ts.ClassLikeDeclaration | undefined
	let hasResolvedSuperClass = false

	for (let member of node.members) {
		if (!ts.isMethodDeclaration(member)
			&& !ts.isPropertyDeclaration(member)
			&& !ts.isGetAccessorDeclaration(member)
		) {
			continue
		}

		let decorator = transformContext.helper.deco.getFirst(member)
		if (decorator) {
			let decoratorName = transformContext.helper.deco.getName(decorator)
			if (isDecoratorName(decoratorName) && canDecorateMember(decoratorName, member)) {
				let memberName = transformContext.helper.getFullText(member.name)
				let isOverwritten = false

				if (isObservableDecoratorName(decoratorName)) {
					if (!hasResolvedSuperClass) {
						superClass = transformContext.helper.class.getSuper(node)
						hasResolvedSuperClass = true
					}

					isOverwritten = !!superClass && !!transformContext.helper.objectLike.getMember(superClass, memberName, true)
				}

				members.push({
					kind: 'decorator',
					member,
					decorator,
					decoratorName,
					memberName,
					isOverwritten,
				})
			}
		}

		// `prop = new Connectable(...)`
		else if (ts.isPropertyDeclaration(member)
			&& member.initializer
			&& ts.isNewExpression(member.initializer)
		) {
			let classDeclaration = transformContext.helper.symbol.resolveDeclaration(member.initializer.expression, ts.isClassLike)

			if (classDeclaration && transformContext.helper.class.isImplementedOf(classDeclaration, 'Connectable', 'lupos')) {
				members.push({kind: 'connectable-property', member})
			}
		}
	}

	return {members}
}


export function isObservableDecoratorName(name: DecoratorName): name is ObservableDecoratorName {
	return (ObservableDecoratorNames as readonly string[]).includes(name)
}


function isDecoratorName(name: string | undefined): name is DecoratorName {
	return !!name && (DecoratorNames as readonly string[]).includes(name)
}


function canDecorateMember(name: DecoratorName, member: ts.ClassElement): boolean {
	if (name === 'computed') {
		return ts.isGetAccessorDeclaration(member)
	}
	else if (name === 'asyncComputed' || name === 'setContext' || name === 'useContext') {
		return ts.isPropertyDeclaration(member)
	}
	else {
		return ts.isMethodDeclaration(member)
	}
}
