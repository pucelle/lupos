import {Component, fade, html} from '@pucelle/lupos.js'


class TestAttribute extends Component {

	className: string = ''

	testClass() {
		return html`<template class="className" />`
	}

	testTransition() {
		return html`<template :transition=${fade()} />`
	}

	testStyle() {
		return html`<template style="background-color: red" />`
	}

	testAttr() {
		return html`<template attr="value" />`
	}

	testContent() {
		return html`<template attr="value"><div attr=${'value'}>${html`<div />`}</div></template>`
	}
}
