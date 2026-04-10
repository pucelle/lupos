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

	testLocalReference() {
		class Child extends Component {}
		return html`<Child />`
	}
}
