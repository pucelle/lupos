import {Component, html} from 'lupos.html'


export class TestIf extends Component {

	prop: number = 1
	content: string = ''
	item: {value: number[]} | undefined = {value: [1]}

	testIf() {
		return html`
			<lu:if ${this.prop}>
				If Content
			</lu:if>
		`
	}

	testIfCacheable() {
		return html`
			<lu:if ${this.prop} cache>
				If Content
			</lu:if>
		`
	}

	testDynamicIfContent() {
		return html`
			<lu:if ${this.prop}>
				${this.content!}
			</lu:if>
		`
	}

	testIfElse() {
		return html`
			<lu:if ${this.prop}>
				If Content
			</lu:if>
			<lu:else>
				Else Content
			</lu:else>
		`
	}

	testIfElseIfElse() {
		return html`
			<lu:if ${this.prop}>
				If Content
			</lu:if>
			<lu:elseif ${this.prop}>
				Then Content 1
			</lu:elseif>
			<lu:elseif ${this.prop}>
				Then Content 2
			</lu:elseif>
			<lu:else>
				Then Content
			</lu:else>
		`
	}

	testIfContentTracking() {
		return html`
			<lu:if ${this.item}>
				${this.item.value.map(v => html`<div>${v}</div>`)}
			</lu:if>
			<lu:elseif ${this.content}>
				${this.content}
			</lu:elseif>
		`
	}

	testIfWithMultipleChildren() {
		return html`
			<lu:if ${this.item && this.item.value}>
				<div>Content 1</div>
				<div>Content 2</div>
			</lu:if>
		`
	}

	data: {metrics: {users: number, subscriptions: number, founders: number}} | null = null;
	renderItem(value: number) { return value }
	renderMultiItemsInIf() {
		return html`
			<lu:if ${this.data}>
				${this.renderItem(this.data.metrics.users)}
				${this.renderItem(this.data.metrics.subscriptions)}
				${this.renderItem(this.data.metrics.founders)}
			</lu:if>
		`
	}

	testNestedIfConditionAfterStaticValue() {
		return html`
			<lu:if ${this.prop}>
				<span>${getLabel()}</span>
				<lu:if ${this.item?.value}>
					Content
				</lu:if>
			</lu:if>
		`
	}

	testNestedIfWithDynamicContentAfterStaticValue() {
		return html`
			<lu:if ${this.prop}>
				<span>${getLabel()}</span>
				<lu:if ${this.item?.value}>
					${getLabel()}
				</lu:if>
			</lu:if>
		`
	}
}

/** Return static content placed before a nested conditional. */
function getLabel(): string {
	return 'Label'
}
