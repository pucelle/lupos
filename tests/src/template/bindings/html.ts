import {Component, html} from 'lupos.html'


export class TestHTMLBinding extends Component {

	html: string = 'HTML'

	testHTML() {
		return html`<div :html=${this.html} />`
	}

	testHTMLOnTemplate() {
		return html`<template :html=${this.html} />`
	}
}
