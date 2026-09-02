const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {spawnSync} = require('node:child_process')
const test = require('node:test')


const repositoryRoot = path.resolve(__dirname, '..')
const compilerPath = path.join(repositoryRoot, 'cli', 'bin', 'luc')

function writeJson(fileName, value) {
	fs.writeFileSync(fileName, JSON.stringify(value, null, '\t'))
}

function writePackage(projectDirectory, name, packageJson) {
	let directory = path.join(projectDirectory, 'node_modules', name)
	fs.mkdirSync(directory, {recursive: true})
	writeJson(path.join(directory, 'package.json'), {name, version: '1.0.0', type: 'module', ...packageJson})
	return directory
}

test('adds runtime extensions to relative and unexported package subpath imports', () => {
	let projectDirectory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-esm-'))

	try {
		writeJson(path.join(projectDirectory, 'tsconfig.json'), {
			compilerOptions: {
				module: 'ESNext',
				moduleResolution: 'Bundler',
				target: 'ES2024',
				strict: true,
				skipLibCheck: true,
				outDir: 'out',
			},
			include: ['*.ts'],
		})

		fs.writeFileSync(path.join(projectDirectory, 'local.ts'), 'export const local = 1\n')

		let extensionPackage = writePackage(projectDirectory, 'extension-package', {
			main: 'index.js',
			types: 'index.d.ts',
		})
		fs.writeFileSync(path.join(extensionPackage, 'index.d.ts'), 'export declare const root: number\n')
		fs.writeFileSync(path.join(extensionPackage, 'index.js'), 'export const root = 1\n')
		fs.writeFileSync(path.join(extensionPackage, 'deep.d.ts'), [
			"import {Component} from 'lupos.html'",
			'export declare const deep: number',
			'export declare class Deep extends Component {}',
			'',
		].join('\n'))
		fs.writeFileSync(path.join(extensionPackage, 'deep.js'), 'export const deep = 1\nexport class Deep {}\n')

		let exportsPackage = writePackage(projectDirectory, 'exports-package', {
			exports: {
				'./deep': {
					types: './deep.d.ts',
					import: './deep.js',
				},
			},
		})
		fs.writeFileSync(path.join(exportsPackage, 'deep.d.ts'), 'export declare const exported: number\n')
		fs.writeFileSync(path.join(exportsPackage, 'deep.js'), 'export const exported = 1\n')

		fs.writeFileSync(path.join(projectDirectory, 'src.ts'), [
			"import {Component, html} from 'lupos.html'",
			"import {local} from './local'",
			"import {Deep, deep} from 'extension-package/deep'",
			"import {root} from 'extension-package'",
			"import {exported} from 'exports-package/deep'",
			'',
			'export class ESMComponent extends Component {',
			'\trender() {',
			'\t\treturn html`<Deep />`',
			'\t}',
			'}',
			'',
			'export async function values() {',
			"\tlet dynamic = await import('./local')",
			'\treturn local + deep + root + exported + dynamic.local',
			'}',
			'',
		].join('\n'))

		let result = spawnSync(process.execPath, [compilerPath, '-e'], {
			cwd: projectDirectory,
			encoding: 'utf8',
		})
		assert.equal(result.status, 0, result.stdout + result.stderr)

		let output = fs.readFileSync(path.join(projectDirectory, 'out', 'src.js'), 'utf8')
		assert.match(output, /from ["']\.\/local\.js["']/)
		assert.match(output, /from ["']extension-package\/deep\.js["']/)
		assert.match(output, /from ["']extension-package["']/)
		assert.match(output, /from ["']exports-package\/deep["']/)
		assert.match(output, /import\(["']\.\/local\.js["']\)/)
	}
	finally {
		fs.rmSync(projectDirectory, {recursive: true, force: true})
	}
})
