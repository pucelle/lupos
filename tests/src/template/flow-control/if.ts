import {Component, html} from '@pucelle/lupos.js'


export class TestIf extends Component {

	prop: number = 1
	content: string = ''
	item: {value: number[]} | undefined = {value: [1]}

	testIf() {
		return html`
			<lu:if ${this.prop}>If Content</lu:if>
		`
	}

	testIfCacheable() {
		return html`
			<lu:if ${this.prop} cache>If Content</lu:if>
		`
	}

	testDynamicIfContent() {
		return html`
			<lu:if ${this.prop}>${this.content!}</lu:if>
		`
	}

	testIfElse() {
		return html`
			<lu:if ${this.prop}>If Content</lu:if>
			<lu:else>Else Content</lu:else>
		`
	}

	testIfElseIfElse() {
		return html`
			<lu:if ${this.prop}>If Content</lu:if>
			<lu:elseif ${this.prop}>Then Content 1</lu:elseif>
			<lu:elseif ${this.prop}>Then Content 2</lu:elseif>
			<lu:else>Then Content</lu:else>
		`
	}

	testIfContentTracking() {
		return html`
			<lu:if ${this.item && this.item.value}>
				${this.item!.value.map(v => html`<div>${v}</div>`)}
			</lu:if>
			<lu:elseif ${this.content}>
				${this.content}
			</lu:elseif>
		`
	}
}
