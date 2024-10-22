import {fade} from '@pucelle/ff'
import {Component, html} from '@pucelle/lupos.js'


export class TestAttribute extends Component {

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
		return html`
			<template attr="value">
				<div attr=${'value'}>
					${html`<div />`}
				</div>
			</template>`
	}

	testContents() {
		return html`
			<template class="className">
				<div attr=${'value'}></div>
				<div attr=${'value'}></div>
			</template>
		`
	}
}
