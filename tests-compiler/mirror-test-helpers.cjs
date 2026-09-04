const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const ts = require('typescript')
const {buildTypeScriptMirror, createLuposMirrorDiagnosticProvider, createMirrorProgram} = require('lupos/mirror-provider')

function checkMirror(lines, verify) {
	const directory = fs.mkdtempSync(path.join(path.resolve(__dirname, '..'), '.mirror-check-'))
	const fileName = path.join(directory, 'src.ts')
	const source = lines.join('\n')
	fs.writeFileSync(fileName, source)
	try {
		const options = {module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
			target: ts.ScriptTarget.ES2024, strict: true, skipLibCheck: true, noUnusedLocals: true}
		const host = ts.createCompilerHost(options)
		const program = ts.createProgram([fileName], options, host)
		const sourceFile = program.getSourceFile(fileName)
		const document = buildTypeScriptMirror(ts, program, sourceFile)
		assert.ok(document)
		const mirrorProgram = createMirrorProgram(program, host, document)
		assert.deepEqual(mirrorProgram.getSyntacticDiagnostics(), [])
		const diagnostics = createLuposMirrorDiagnosticProvider(program, host).getSemanticDiagnostics(sourceFile)
		const errors = diagnostics.map(d => ({code: d.code, text: source.slice(d.start, d.start + d.length),
			message: ts.flattenDiagnosticMessageText(d.messageText, '\n')}))
		verify(errors, document)
	}
	finally {
		fs.rmSync(directory, {recursive: true, force: true})
	}
}

module.exports = {checkMirror}
