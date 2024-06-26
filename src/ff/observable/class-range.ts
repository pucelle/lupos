import type ts from 'typescript'
import {helper} from '../../base/helper'


enum ObservedClassType{
	ObservedClass = 1,
	Component = 2,
}

export namespace ClassRange {

	const ObservedStack: number[] = []
	let currentlyObservedType: number = 0
	
	
	/** Whether currently inside of an observed class. */
	export function isObserved(): boolean {
		return (currentlyObservedType & ObservedClassType.ObservedClass) > 0
	}


	/** Whether currently inside of a component. */
	export function isComponent() {
		return (currentlyObservedType & ObservedClassType.Component) > 0
	}


	/** Test observed type of a node, and push state always. */
	export function pushMayObserved(node: ts.ClassDeclaration) {
		let state: number = 0

		if (helper.isDerivedClassOf(node, 'Component', '@pucelle/lupos.js')) {
			state = ObservedClassType.ObservedClass | ObservedClassType.Component
		}
		else if (helper.isClassImplemented(node, 'Observed', '@pucelle/ff')) {
			state = ObservedClassType.ObservedClass
		}

		ObservedStack.push(currentlyObservedType)
		currentlyObservedType = state
	}


	/** Pop a class, always along after `pushMayObservedClass`. */
	export function pop() {
		currentlyObservedType = ObservedStack.pop()!
	}
}