import type * as ts from 'typescript'
import {TSHelper} from './ts-helper'


enum ObservableType{
	Observable = 1,
	Component = 2,
}

const ObservableStack: number[] = []
let currentObservable: number = 0

/** Whether currently inside of an observable. */
export function isObservable(): boolean {
	return (currentObservable & ObservableType.Observable) > 0
}

/** Whether currently inside of a component. */
export function isComponent() {
	return (currentObservable & ObservableType.Component) > 0
}

/** Test Observable type of a node, and push state. */
export function pushObservableState(node: ts.ClassDeclaration, helper: TSHelper) {
	let state: number = 0

	if (helper.isDerivedClassOfNamed(node, 'Component')) {
		state = ObservableType.Observable | ObservableType.Component
	}
	else if (helper.isDerivedClassOfDecorated(node, 'observable')) {
		state = ObservableType.Observable
	}

	ObservableStack.push(currentObservable)
	currentObservable = state
}

/** Pop Observable state */
export function popObservableState() {
	currentObservable = ObservableStack.pop()!
}