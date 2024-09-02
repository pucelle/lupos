import {Component, html} from '@pucelle/lupos.js'


class TestSwitch extends Component {

	value: number = 1

	testCaseOnly() {
		return html`
			<lupos:switch ${this.value}>
				<lupos:case ${1}>
					Case Content 1
				</lupos:case>
				<lupos:case ${2}>
					Case Content 2
				</lupos:case>
			</lupos:switch>
		`
	}

	testCaseDefault() {
		return html`
			<lupos:switch ${this.value}>
				<lupos:case ${1}>
					Case Content 1
				</lupos:case>
				<lupos:case ${2}>
					Case Content 2
				</lupos:case>
				<lupos:default>
					Case Content 3
				</lupos:default>
			</lupos:switch>
		`
	}
}
