import {fade, Component, html} from 'lupos.html'


export class TestTransitionBinding extends Component {

	duration: number = 300

	testTransition() {
		return html`<div :transition=${fade({duration: this.duration})} />`
	}
	
	testStaticTransition() {
		return html`<div :transition=${fade({duration: 300})} />`
	}
	
	withQueryToken() {
		return html`<div ?:transition=${this.duration, fade({duration: this.duration})} />`
	}

	withQueryTokenAndStaticContent() {
		return html`<div ?:transition=${this.duration, fade({duration: 3000})} />`
	}
}

