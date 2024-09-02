import {Component, html, svg} from '@pucelle/lupos.js'


class TestTemplateOutput extends Component {

	prop: number = 1
	readonly readonlyProp: number = 1

	testTemplate() {
		return html`<template class="className" />`
	}

	testSVG() {
		return svg`<path />`
	}

	testSVGContentSeparating() {
		return svg`<slot name="slotName"><path /></slot>`
	}

	testHoistingLocalDeclarations() {
		return html`<div @click= />`
	}
}
