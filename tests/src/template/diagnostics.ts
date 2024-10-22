import {Component, html} from '@pucelle/lupos.js'


export class TestDiagnostics extends Component {

	// testUnImportedBinding() {
	// 	return html`<template :binding=${true}>`
	// }

	// testUnImportedCom() {
	// 	return html`<Com>`
	// }

	testMultipleBindingParameters() {
		return html`<template :class=${true, 'style'}>`
	}
}
