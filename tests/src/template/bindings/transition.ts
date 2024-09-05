import {Component, fade, html} from '@pucelle/lupos.js'


class TestTransitionBinding extends Component {

	duration: number = 300

	testTransition() {
		return html`<div :transition=${fade({duration: this.duration})} />`
	}
	
	testStaticTransition() {
		return html`<div :transition=${fade({duration: 300})} />`
	}
}

