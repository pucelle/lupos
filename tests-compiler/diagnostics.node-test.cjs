const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {spawnSync} = require('node:child_process')
const test = require('node:test')


const repositoryRoot = path.resolve(__dirname, '..')
const compilerPath = path.join(repositoryRoot, 'cli', 'bin', 'luc')

function compile(projectDirectory) {
	let result = spawnSync(process.execPath, [compilerPath], {
		cwd: projectDirectory,
		encoding: 'utf8',
	})

	return {
		status: result.status,
		output: result.stdout + result.stderr,
	}
}

test('adds transformer diagnostics and deletes superseded TypeScript diagnostics', () => {
	let projectDirectory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-diagnostics-'))

	try {
		fs.writeFileSync(path.join(projectDirectory, 'tsconfig.json'), JSON.stringify({
			compilerOptions: {
				module: 'ESNext',
				moduleResolution: 'Bundler',
				target: 'ES2024',
				strict: true,
				noUnusedLocals: true,
				skipLibCheck: true,
				outDir: 'out',
			},
			include: ['src.ts'],
		}, null, '\t'))

		let sourcePrefix = [
			"import {Component, html} from 'lupos.html'",
			'',
			'class UsedOnlyByTemplate extends Component {}',
			'',
			'export class DiagnosticTest extends Component {',
			'\trender() {',
			'\t\treturn html`',
			'\t\t\t<UsedOnlyByTemplate />',
		]
		let sourceSuffix = [
			'\t\t`',
			'\t}',
			'}',
			'',
		]

		fs.writeFileSync(
			path.join(projectDirectory, 'src.ts'),
			[...sourcePrefix, '\t\t\t<lu:if></lu:if>', ...sourceSuffix].join(os.EOL)
		)

		let invalid = compile(projectDirectory)
		assert.notEqual(invalid.status, 0)
		assert.match(invalid.output, /error TS6210: '<lu:if \$\{\.\.\.\}>' must accept a parameter as condition\./)
		assert.doesNotMatch(invalid.output, /UsedOnlyByTemplate.*never (?:read|used)/)

		fs.writeFileSync(
			path.join(projectDirectory, 'src.ts'),
			[...sourcePrefix, ...sourceSuffix].join(os.EOL)
		)

		let valid = compile(projectDirectory)
		assert.equal(valid.status, 0, valid.output)
		assert.equal(valid.output, '')
	}
	finally {
		fs.rmSync(projectDirectory, {recursive: true, force: true})
	}
})

test('reports malformed HTML tag structure in templates', () => {
	let projectDirectory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-html-diagnostics-'))

	try {
		fs.writeFileSync(path.join(projectDirectory, 'tsconfig.json'), JSON.stringify({
			compilerOptions: {
				module: 'ESNext',
				moduleResolution: 'Bundler',
				target: 'ES2024',
				strict: true,
				skipLibCheck: true,
				outDir: 'out',
			},
			include: ['src.ts'],
		}, null, '\t'))

		let writeSource = template => fs.writeFileSync(
			path.join(projectDirectory, 'src.ts'),
			`import {html} from 'lupos.html'\nexport const result = html\`${template}\`\n`
		)

		writeSource('<div><span></div>')
		let mismatched = compile(projectDirectory)
		assert.notEqual(mismatched.status, 0)
		assert.match(mismatched.output, /warning TS30005: Closing tag '<\/div>' does not match opening tag '<span>'\./)

		writeSource('<section><div></div>')
		let unclosed = compile(projectDirectory)
		assert.notEqual(unclosed.status, 0)
		assert.match(unclosed.output, /warning TS30006: Tag '<section>' is not closed\./)

		writeSource('</aside>')
		let unmatched = compile(projectDirectory)
		assert.notEqual(unmatched.status, 0)
		assert.match(unmatched.output, /warning TS30005: Closing tag '<\/aside>' has no matching opening tag\./)

		writeSource('<div><img><input /></div>')
		let valid = compile(projectDirectory)
		assert.equal(valid.status, 0, valid.output)
		assert.equal(valid.output, '')
	}
	finally {
		fs.rmSync(projectDirectory, {recursive: true, force: true})
	}
})
