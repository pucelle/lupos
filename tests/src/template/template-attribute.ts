import {Component, html} from '@pucelle/lupos.js'


class TestAttribute extends Component {

	testClass() {
		return html`<template class="className" />`
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
