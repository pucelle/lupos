import {Observed} from '../../../../web/out'
import {Component, html} from 'lupos.html'


/** A callback type must not make its parameter name a captured template variable. */
interface ForEvents {

	/** Reuse the property name that appears in transferred tracking expressions. */
	select: (selection: {value: number}) => void
}


export class TestFor extends Component<ForEvents> {

	prop: number = 1
	items: {value: number}[] = [{value: 1}]
	readonly readonlyItems: {value: number}[] = [{value: 1}]
	readonly deepReadonlyItems: ReadonlyArray<{value: number}> = [{value: 1}]

	/** Object receiver whose generated tracking property name must not become a capture. */
	selection: {value: number} = {value: 1}

	/** Tuple values used by array-destructuring loop tests. */
	entries: [string, {value: number}][] = [['key', {value: 1}]]

	/** Object values used by object-destructuring loop tests. */
	records: {prop1: string, prop2: number}[] = [{prop1: 'text', prop2: 1}]
	
	renderer = this.renderItemWithIndex

	getItems(): Observed<{value: number}[]> {
		return this.items
	}

	renderItem(n: number) {
		return html`${n + this.prop}`
	}

	renderItemWithIndex(n: number, index: number) {
		return html`${n + index + this.prop}`
	}

	testForRenderer() {
		return html`
			<lu:for ${[1,2,3]}>
				${this.renderItem}
			</lu:for>
		`
	}

	testForRendererWithParameter() {
		return html`
			<lu:for ${[1,2,3]}>
				${(n) => this.renderItem(n)}
			</lu:for>
		`
	}

	testForRendererWithParameters() {
		return html`
			<lu:for ${[1,2,3]}>
				${(n, index) => this.renderItemWithIndex(n, index)}
			</lu:for>
		`
	}

	testForOfRenderMethod() {
		return html`
			<lu:for ${n} of ${[1,2,3]}>
				${this.renderItem(n)}
			</lu:for>
		`
	}

	testForOfInlineBody() {
		return html`
			<lu:for ${n} of ${[1,2,3]}>
				${n + this.prop}
			</lu:for>
		`
	}

	testForOfIndex() {
		return html`
			<lu:for ${item, index} of ${this.items}>
				<div .title=${index + ''}>${item.value}: ${index}</div>
			</lu:for>
		`
	}

	/** Render tuple entries with an index. */
	testForOfArrayDestructuring() {
		return html`
			<lu:for ${[key, value], index} of ${this.entries}>
				<div>${key}: ${value.value}: ${index}</div>
			</lu:for>
		`
	}

	/** Render shorthand object properties. */
	testForOfObjectDestructuring() {
		return html`
			<lu:for ${{prop1, prop2}} of ${this.records}>
				<div>${prop1}: ${prop2}</div>
			</lu:for>
		`
	}

	/** Render aliased and rest object properties. */
	testForOfAliasedRestDestructuring() {
		return html`
			<lu:for ${{prop1: label, ...rest}} of ${this.records}>
				<div>${label}: ${rest.prop2}</div>
			</lu:for>
		`
	}

	testForOfNestedIf() {
		return html`
			<lu:for ${item} of ${this.items}>
				<lu:if ${item.value > 0}>
					<lu:for ${value, index} of ${[item.value]}>
						${index}: ${value}
					</lu:for>
				</lu:if>
			</lu:for>
		`
	}

	testForOfLocalVariableTransferring() {
		let prop = this.prop

		return html`
			<lu:for ${n} of ${[1,2,3]}>
				${n + prop}
			</lu:for>
		`
	}

	testForOfTracking() {
		return html`
			<lu:for ${item} of ${this.items}>
				${item.value}
			</lu:for>
		`
	}

	/** Transferred tracking must preserve member names on a context receiver. */
	testForOfTrackedPropertyReceiver() {
		return html`
			<lu:for ${item} of ${this.items}>
				${item.value === this.selection.value}
			</lu:for>
		`
	}

	/** A real local receiver with the same name as a member must still be captured. */
	testForOfTrackedLocalReceiver() {
		let selection = this.selection

		return html`
			<lu:for ${item} of ${this.items}>
				${item.value === selection.value}
			</lu:for>
		`
	}

	testForOfMethodGetTracking() {
		return html`
			<lu:for ${item} of ${this.getItems()}>
				${item.value}
			</lu:for>
		`
	}

	testForOfVariableTracking() {
		let items = this.items

		return html`
			<lu:for ${item} of ${items}>
				${item.value}
			</lu:for>
		`
	}

	testReadonlyTracking() {
		return html`
			<lu:for ${item} of ${this.readonlyItems}>
				${item.value}
			</lu:for>
		`
	}

	testReadonlyVariableTracking() {
		let items = this.readonlyItems

		return html`
			<lu:for ${item} of ${items}>
				${item.value}
			</lu:for>
		`
	}

	testDeepReadonlyTracking() {
		return html`
			<lu:for ${item} of ${this.deepReadonlyItems}>
				${item.value}
			</lu:for>
		`
	}

	testDeepReadonlyVariableTracking() {
		let items = this.deepReadonlyItems

		return html`
			<lu:for ${item} of ${items}>
				${item.value}
			</lu:for>
		`
	}

	testForDynamicRenderer() {
		return html`
			<lu:for ${[1,2,3]}>
				${this.renderer}
			</lu:for>
		`
	}

	testForOfEmptyBody() {
		return html`
			<lu:for ${item, index} of ${new Set<string>()}></lu:for>
		`
	}

	/** Preserve loop identity by a literal property name. */
	testForKeyProperty() {
		return html`<lu:for ${item} of ${this.items} key="value">${item.value}</lu:for>`
	}

	/** Key callbacks infer their item and track its observed properties. */
	testForKeyCallback() {
		return html`<lu:for key=${item => item.value} ${item, index} of ${this.items}>${index}: ${item.value}</lu:for>`
	}

	/** A key extractor can capture a local used by a dynamic selector. */
	testForKeyLocal(suffix: string) {
		return html`<lu:for ${item} of ${this.items} key=${item => suffix + item.value}>${item.value}</lu:for>`
	}

	/** Renderer shorthand accepts the same key option as inline bodies. */
	testForKeyRenderer() {
		return html`<lu:for ${this.items} key=${'value'}>${item => html`${item.value}`}</lu:for>`
	}

	/** Destructured loops derive keys from the full item, not its binding pattern. */
	testForKeyDestructured() {
		return html`<lu:for ${[key, value]} of ${this.entries} key=${entry => entry[0]}>${key}: ${value.value}</lu:for>`
	}

	/** Mutable key options are refreshed before the corresponding data update. */
	testForKeyDynamic(key: 'value' | ((item: {value: number}) => unknown) | undefined) {
		return html`<lu:for ${item} of ${this.items} key=${key}>${item.value}</lu:for>`
	}
}
