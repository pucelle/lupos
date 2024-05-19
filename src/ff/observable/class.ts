import type * as ts from 'typescript'
import {TSHelper} from '../../base/ts-helper'


enum ObservedClassType{
	ObservedClass = 1,
	Component = 2,
}

const ObservedStack: number[] = []
let currentObservedType: number = 0

/** Whether currently inside of an observed class. */
export function isObservedClass(): boolean {
	return (currentObservedType & ObservedClassType.ObservedClass) > 0
}

/** Whether currently inside of a component. */
export function isComponent() {
	return (currentObservedType & ObservedClassType.Component) > 0
}

/** Test observed type of a node, and push state always. */
export function pushMayObservedClass(node: ts.ClassDeclaration, helper: TSHelper) {
	let state: number = 0

	if (helper.isDerivedClassOf(node, 'Component', '@pucelle/lupos.js')) {
		state = ObservedClassType.ObservedClass | ObservedClassType.Component
	}
	else if (helper.isClassImplemented(node, 'Observed', '@pucelle/ff')) {
		state = ObservedClassType.ObservedClass
	}

	ObservedStack.push(currentObservedType)
	currentObservedType = state
}

/** Pop a class, always along after `pushMayObservedClass`. */
export function popMayObservedClass() {
	currentObservedType = ObservedStack.pop()!
}