import {Component, html} from '@pucelle/lupos.js'


export class TestSwitch extends Component {

	value: number = 1

	testCaseOnly() {
		return html`
			<lu:switch ${this.value}>
				<lu:case ${1}>
					Case Content 1
				</lu:case>
				<lu:case ${2}>
					Case Content 2
				</lu:case>
			</lu:switch>
		`
	}

	testCaseDefault() {
		return html`
			<lu:switch ${this.value}>
				<lu:case ${1}>
					Case Content 1
				</lu:case>
				<lu:case ${2}>
					Case Content 2
				</lu:case>
				<lu:default>
					Case Content 3
				</lu:default>
			</lu:switch>
		`
	}
}
