import {Component, html, svg} from 'lupos.html'


/** Extracted control bodies must retain the namespace of their insertion point. */
export class TestSVGFlowControl extends Component {

	/** Select conditional and switch branches. */
	value: number = 1

	/** Destructured keyed items reproduce SVG leader-line rendering. */
	items: {id: string, value: number}[] = [{id: 'line', value: 1}]

	/** Await bodies use shared-value subtrees instead of independent templates. */
	promise = new Promise<null>(() => {})

	/** A loop in an HTML template still creates SVG line elements. */
	testFor() {
		return html`
			<svg>
				<lu:for ${{value}} of ${this.items} key="id">
					<line data-case="for" x1=${value} />
				</lu:for>
			</svg>
		`
	}

	/** All sibling branches retain SVG context, including detached elseif and else nodes. */
	testIf() {
		return html`
			<svg>
				<lu:if ${this.value === 1}><line data-case="if" /></lu:if>
				<lu:elseif ${this.value === 2}><circle data-case="elseif" /></lu:elseif>
				<lu:else><path data-case="else" /></lu:else>
			</svg>
		`
	}

	/** Cached branches use the same namespace as uncached branches. */
	testCachedIf() {
		return html`
			<svg>
				<lu:if ${this.value === 1} cache><line data-case="cached-if" /></lu:if>
				<lu:else><path data-case="cached-else" /></lu:else>
			</svg>
		`
	}

	/** Switch case and default bodies are extracted separately. */
	testSwitch() {
		return html`
			<svg>
				<lu:switch ${this.value}>
					<lu:case ${1}><line data-case="case" /></lu:case>
					<lu:default><path data-case="default" /></lu:default>
				</lu:switch>
			</svg>
		`
	}

	/** Cached switch branches must also be parsed as SVG. */
	testCachedSwitch() {
		return html`
			<svg>
				<lu:switch ${this.value} cache>
					<lu:case ${1}><line data-case="cached-case" /></lu:case>
					<lu:default><path data-case="cached-default" /></lu:default>
				</lu:switch>
			</svg>
		`
	}

	/** Keyed and cached bodies inherit an enclosing SVG element. */
	testKeyedAndCache() {
		return html`
			<svg>
				<lu:keyed ${this.value}><line data-case="keyed" /></lu:keyed>
				<lu:cache><circle data-case="cache" /></lu:cache>
			</svg>
		`
	}

	/** Await subtrees retain SVG context without an enclosing svg-tagged literal. */
	testAwait() {
		return html`<svg><lu:await ${this.promise}><line data-case="await" /></lu:await></svg>`
	}

	/** Namespace context persists through multiple levels of extraction. */
	testNested() {
		return html`
			<svg>
				<lu:for ${{value}} of ${this.items}>
					<g>
						<lu:if ${value}><line data-case="nested-if" /></lu:if>
						<lu:else><path data-case="nested-else" /></lu:else>
						<lu:await ${this.promise}><circle data-case="nested-await" /></lu:await>
					</g>
				</lu:for>
			</svg>
		`
	}

	/** Explicit SVG literals retain their namespace when extracting control content. */
	testSVGTemplate() {
		return svg`<lu:if ${this.value}><line data-case="svg-literal" /></lu:if>`
	}

	/** An existing first SVG root must not leave its following siblings in HTML. */
	testMultipleRoots() {
		return svg`
			<lu:cache>
				<svg data-case="first-svg" />
				<line data-case="following-line" />
			</lu:cache>
		`
	}

	/** A foreignObject switches children back to HTML, even inside an SVG template. */
	testForeignObject() {
		return svg`
			<foreignObject>
				<lu:for ${{value}} of ${this.items}><div data-case="html-for">${value}</div></lu:for>
				<lu:if ${this.value}><div data-case="html-if" /></lu:if>
				<lu:else><div data-case="html-else" /></lu:else>
				<lu:await ${this.promise}><div data-case="html-await" /></lu:await>
				<svg><lu:keyed ${this.value}><line data-case="svg-reentry" /></lu:keyed></svg>
			</foreignObject>
		`
	}
}
