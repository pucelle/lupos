import {Component, html} from '@pucelle/lupos.js'


class TestDiagnostics extends Component {

	testMultipleBindingParameters() {
		return html`<template :class=${true, 'style'}>`
	}
}
