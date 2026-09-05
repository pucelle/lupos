const assert = require('node:assert/strict')
const test = require('node:test')


const {patchHost} = require('../cli/compiler/out/patch')


test('passes the previous program without reading a released builder', () => {
	let firstProgram = {revision: 1}
	let secondProgram = {revision: 2}
	let builders = [createBuilder(firstProgram), createBuilder(secondProgram)]
	let previousPrograms = []
	let host = {
		createProgram() {
			return builders.shift()
		},
	}

	patchHost(host, () => {}, false, false, {}, (_program, _compilerHost, previousProgram) => {
		previousPrograms.push(previousProgram)
		return {getSemanticDiagnostics: () => null}
	})

	let compilerHost = {}
	let firstBuilder = host.createProgram(undefined, {}, compilerHost, undefined)
	firstBuilder.getProgram = () => {
		throw new Error('released builder')
	}

	host.createProgram(undefined, {}, compilerHost, firstBuilder)

	assert.deepEqual(previousPrograms, [undefined, firstProgram])
})


function createBuilder(program) {
	return {
		getProgram() {
			return program
		},

		getSemanticDiagnostics() {
			return []
		},

		emit() {
			return {emitSkipped: false, diagnostics: []}
		},

		getCompilerOptions() {
			return {}
		},
	}
}
