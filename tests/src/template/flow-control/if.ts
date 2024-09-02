import {Component, html} from '@pucelle/lupos.js'


class TestIf extends Component {

	prop: number = 1
	content: string = ''

	testIf() {
		return html`
			<lupos:if ${this.prop}>If Content</lupos:if>
		`
	}

	testIfCacheable() {
		return html`
			<lupos:if ${this.prop} cache>If Content</lupos:if>
		`
	}

	testDynamicIfContent() {
		return html`
			<lupos:if ${this.prop}>${this.content}</lupos:if>
		`
	}

	testIfElse() {
		return html`
			<lupos:if ${this.prop}>If Content</lupos:if>
			<lupos:else>Else Content</lupos:else>
		`
	}

	testIfElseIfElse() {
		return html`
			<lupos:if ${this.prop}>If Content</lupos:if>
			<lupos:elseif ${this.prop}>Then Content 1</lupos:elseif>
			<lupos:elseif ${this.prop}>Then Content 2</lupos:elseif>
			<lupos:else>Then Content</lupos:else>
		`
	}
}
