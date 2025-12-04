import {Component, html} from 'lupos.html'


export class TestAttribute extends Component {

	className = 'className'
	booleanValue = true
	nullableClassName!: string | null

	testInterpolatedString() {
		return html`<div class="${this.className} className2" />`
	}

	testString() {
		return html`<div class=${this.className} />`
	}

	testNullableAttr() {
		return html`<div class=${this.nullableClassName} />`
	}

	testComponentClass() {
		return html`<Com class="className" />`
	}

	testQueryAttr() {
		return html`<div ?hidden=${this.booleanValue} />`
	}

	testEmptyAttrValue() {
		return html`<Com autofocus />`
	}
}

class Com extends Component {

	render() {
		return html`
			<template class="classNameSelf">
		`
	}
}