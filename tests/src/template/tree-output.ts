import {Component, html, svg} from 'lupos.html'


export class TestTemplateOutput extends Component {

	prop: number = 1
	readonly readonlyProp: number = 1

	testTemplate() {
		return html`<template class="className" />`
	}

	testSVG() {
		return svg`<path />`
	}

	testLocalClass() {
		class ChildClass extends Component {}
		return html`<ChildClass />`
	}

	testLocalVariable() {
		class ChildClass extends Component {}
		const ChildVariable = ChildClass

		return html`<ChildVariable />`
	}
}
