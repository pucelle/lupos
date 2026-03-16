import {Component, html, RenderResult} from 'lupos.html'


export class TestStyleBinding extends Component {

	styleValue = 'red'
	numericValue = 1

	testInterpolatedString() {
		return html`<div :style="color: ${this.styleValue}" />`
	}

	testString() {
		return html`<div :style=${`color: ${this.styleValue}`} />`
	}

	testQuoted() {
		return html`<div :style="${this.numericValue}" />`
	}

	testObject() {
		return html`<div :style=${{color: this.styleValue}} />`
	}

	testModifier() {
		return html`<div :style.background-color=${this.styleValue} />`
	}

	testPxModifier() {
		return html`<div :style.width.px=${this.numericValue} />`
	}

	testPercentModifier() {
		return html`<div :style.width.percent=${this.numericValue} />`
	}

	testURLModifier() {
		return html`<div :style.background.url=${this.styleValue} />`
	}

	testConflictWithStyleAttr() {
		return html`<div style="background: ${this.styleValue}" :style.background=${this.styleValue} />`
	}

	testStylesInFor() {
		let rendered: RenderResult[] = []
		for (let i = 0; i < 10; i++) {
			
		}

		let left = 0

		for (let i = 0; i < 10; i++) {
			if (i % 2 === 0) {
				rendered.push(html`
					<div :style.left.px=${left}>
						${i}
					</div>`
				)
			}
		}

		return rendered
	}
}


export class TestStaticStyleBinding extends Component {

	testInterpolatedString() {
		return html`<div :style="color: ${'red'}" />`
	}

	testString() {
		return html`<div :style=${'styleValue'} />`
	}

	testObject() {
		return html`<div :style=${{styleName: 'styleValue'}} />`
	}

	testModifier() {
		return html`<div :style.prop=${true} />`
	}
}