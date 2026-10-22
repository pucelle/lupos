const assert = require('node:assert/strict')
const test = require('node:test')
const {checkMirror} = require('./mirror-test-helpers.cjs')


test('checks loop key properties and contextually types full-item key extractors', () => {
	checkMirror([
		"import {html} from 'lupos.html'",
		'declare const rows: {id: number, name: string}[]',
		'declare const entries: [string, {value: number}][]',
		'export const result = html`',
		'<lu:for ${row} of ${rows} key="id">${row.name}</lu:for>',
		'<lu:for key=${row => row.id} ${row} of ${rows}>${row.name}</lu:for>',
		'<lu:for ${rows} key=${row => row.name}>${row => html`${row.name}`}</lu:for>',
		'<lu:for ${[key, value]} of ${entries} key=${entry => entry[0]}>${key}: ${value.value}</lu:for>',
		'`',
	], errors => {
		assert.deepEqual(errors, [])
	})
})

test('reports invalid key names, extractor parameters and extractor bodies', () => {
	checkMirror([
		"import {html} from 'lupos.html'",
		'declare const rows: {id: number, name: string}[]',
		'export const result = html`',
		'<lu:for ${row} of ${rows} key=${"missing"}>${row.name}</lu:for>',
		'<lu:for ${row} of ${rows} key="missing">${row.name}</lu:for>',
		'<lu:for ${row} of ${rows} key=${row => row.missing}>${row.name}</lu:for>',
		'<lu:for ${rows} key=${(row: number) => row}>${row => html`${row.name}`}</lu:for>',
		'`',
	], errors => {
		assert.equal(errors.length, 4, JSON.stringify(errors))
		assert.deepEqual(errors.map(error => error.code).sort(), [2339, 2345, 2345, 2345])
	})
})
