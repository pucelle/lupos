const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {spawn} = require('node:child_process')
const test = require('node:test')
const ts = require('typescript')
const {repositoryRoot, compile: compileProject} = require('./compiler-test-helpers.cjs')
const {cleanCachedOutputs} = require('../cli/compiler/out/compiler/clean-cache.js')


/** Keep every generated fixture and its cleanup inside a unique test directory. */
function withProject(verify) {
	let directory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-cache-'))
	try {
		verify(directory)
	}
	finally {
		fs.rmSync(directory, {recursive: true, force: true})
	}
}

/** Write one fixture file and create its parent directories. */
function write(directory, fileName, content) {
	let target = path.join(directory, fileName)
	fs.mkdirSync(path.dirname(target), {recursive: true})
	fs.writeFileSync(target, typeof content === 'string' ? content : JSON.stringify(content))
	return target
}

/** Compile with the real CLI to check custom argument parsing and subsequent emission. */
function compile(directory, args = []) {
	let result = compileProject(directory, args)
	assert.equal(result.status, 0, result.output)
	return result.output
}

/** Exercise cleanup independently of compilation while recording diagnostics and logs. */
function clean(directory) {
	let output = ''
	let diagnostics = []
	let system = {...ts.sys, write(message) { output += message }}
	let success = cleanCachedOutputs(system, path.join(directory, 'tsconfig.json'), diagnostic => {
		diagnostics.push(diagnostic)
	})

	return {success, output, diagnostics}
}


for (let flag of ['-c', '--cache']) {
	test(`${flag} removes and logs orphaned js and declarations, then compiles normally`, () => {
		withProject(directory => {
			write(directory, 'tsconfig.json', {
				compilerOptions: {
					target: 'ES2023', module: 'ESNext', moduleResolution: 'Bundler',
					rootDir: 'src', outDir: 'out', declaration: true, declarationDir: 'types',
					types: [], skipLibCheck: true,
				},
				include: ['src/**/*.ts'],
			})

			write(directory, 'src/current.ts', 'export let current = 1\n')
			let deletedSource = write(directory, 'src/nested/deleted.ts', 'export let deleted = 1\n')
			compile(directory)
			fs.unlinkSync(deletedSource)

			let orphanJS = path.join(directory, 'out/nested/deleted.js')
			let orphanDeclaration = path.join(directory, 'types/nested/deleted.d.ts')
			let unrelated = write(directory, 'out/asset.json', '{}')
			let sourceMap = write(directory, 'out/nested/deleted.js.map', '{}')
			let outside = write(directory, 'handwritten.js', 'export let untouched = true\n')

			compile(directory)
			assert.ok(fs.existsSync(orphanJS), 'cleanup is opt-in')
			assert.ok(fs.existsSync(orphanDeclaration), 'cleanup is opt-in')

			let output = compile(directory, [flag, '-e', '-s'])
			for (let fileName of [orphanJS, orphanDeclaration]) {
				assert.ok(!fs.existsSync(fileName))
				assert.ok(output.includes(`Removed "${fileName}".`), output)
			}

			for (let fileName of [unrelated, sourceMap, outside, 'out/current.js', 'types/current.d.ts']) {
				assert.ok(fs.existsSync(path.resolve(directory, fileName)), fileName)
			}

			assert.match(fs.readFileSync(path.join(directory, 'out/current.js'), 'utf8'), /current = 1/)
		})
	})
}

test('preserves outputs from referenced projects sharing an output directory', () => {
	withProject(directory => {
		write(directory, 'tsconfig.json', {files: [], references: [{path: './first'}, {path: './second'}]})
		for (let name of ['first', 'second']) {
			write(directory, `${name}/tsconfig.json`, {
				compilerOptions: {rootDir: 'src', outDir: '../out', declaration: true, composite: true},
				include: ['src/**/*.ts'],
			})
			write(directory, `${name}/src/${name}.ts`, 'export let value = 1\n')
			write(directory, `out/${name}.js`, 'existing output')
			write(directory, `out/${name}.d.ts`, 'existing declaration')
		}

		let orphan = write(directory, 'out/removed.d.ts', 'old declaration')
		let result = clean(directory)
		assert.equal(result.success, true)
		assert.deepEqual(result.diagnostics, [])
		assert.ok(!fs.existsSync(orphan))
		for (let name of ['first', 'second']) {
			assert.equal(fs.readFileSync(path.join(directory, `out/${name}.js`), 'utf8'), 'existing output')
			assert.equal(fs.readFileSync(path.join(directory, `out/${name}.d.ts`), 'utf8'), 'existing declaration')
		}
	})
})

test('does not clean source directories or projects without a separate output directory', () => {
	withProject(directory => {
		write(directory, 'src/current.ts', 'export let current = 1\n')
		let retained = write(directory, 'src/manual.js', 'handwritten source')
		for (let compilerOptions of [{}, {rootDir: 'src', outDir: 'src'}, {outDir: '.'}]) {
			write(directory, 'tsconfig.json', {compilerOptions, files: ['src/current.ts']})
			let result = clean(directory)
			assert.equal(result.success, true)
			assert.equal(fs.readFileSync(retained, 'utf8'), 'handwritten source')
		}
	})
})

test('does not follow directory symlinks or remove dependency files', () => {
	withProject(directory => {
		write(directory, 'tsconfig.json', {compilerOptions: {rootDir: 'src', outDir: 'out'}, files: ['src/current.ts']})
		write(directory, 'src/current.ts', 'export let current = 1\n')
		let retained = write(directory, 'external/retained.js', 'outside output')
		let dependency = write(directory, 'out/node_modules/package/index.js', 'dependency')
		fs.symlinkSync(path.join(directory, 'external'), path.join(directory, 'out/linked'), 'junction')
		let orphan = write(directory, 'out/orphan.js', 'old output')
		let result = clean(directory)
		assert.equal(result.success, true)
		assert.ok(!fs.existsSync(orphan))
		assert.ok(fs.existsSync(retained))
		assert.ok(fs.existsSync(dependency))
	})
})

test('validates every referenced configuration before removing any files', () => {
	withProject(directory => {
		write(directory, 'tsconfig.json', {
			compilerOptions: {rootDir: 'src', outDir: 'out'},
			files: ['src/current.ts'],
			references: [{path: './missing'}],
		})
		write(directory, 'src/current.ts', 'export let current = 1\n')
		let retained = write(directory, 'out/orphan.js', 'retain on invalid config')
		let result = clean(directory)
		assert.equal(result.success, false)
		assert.ok(result.diagnostics.length > 0)
		assert.ok(fs.existsSync(retained))
	})
})

test('removes outputs for explicitly listed sources that no longer exist', () => {
	withProject(directory => {
		write(directory, 'tsconfig.json', {
			compilerOptions: {rootDir: 'src', outDir: 'out', declaration: true},
			files: ['src/current.ts', 'src/removed.ts'],
		})
		write(directory, 'src/current.ts', 'export let current = 1\n')
		let removedJS = write(directory, 'out/removed.js', 'old output')
		let removedDeclaration = write(directory, 'out/removed.d.ts', 'old declaration')
		let result = clean(directory)
		assert.equal(result.success, true)
		assert.ok(!fs.existsSync(removedJS))
		assert.ok(!fs.existsSync(removedDeclaration))
	})
})

test('preserves imported sources outside include patterns and infers their shared source root', () => {
	withProject(directory => {
		write(directory, 'tsconfig.json', {
			compilerOptions: {outDir: 'out', declaration: true, types: []},
			files: ['src/current.ts'],
		})
		write(directory, 'src/current.ts', "export {value} from '../shared/value'\n")
		write(directory, 'shared/value.ts', 'export let value = 1\n')
		for (let fileName of ['src/current.js', 'src/current.d.ts', 'shared/value.js', 'shared/value.d.ts']) {
			write(directory, `out/${fileName}`, 'current output')
		}

		let orphan = write(directory, 'out/removed.js', 'old output')
		let result = clean(directory)
		assert.equal(result.success, true)
		assert.ok(!fs.existsSync(orphan))
		for (let fileName of ['src/current.js', 'src/current.d.ts', 'shared/value.js', 'shared/value.d.ts']) {
			assert.equal(fs.readFileSync(path.join(directory, `out/${fileName}`), 'utf8'), 'current output')
		}
	})
})

test('cleans stale outputs before starting watch mode', async () => {
	let directory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-cache-'))
	let child
	let closed
	let output = ''

	try {
		write(directory, 'tsconfig.json', {
			compilerOptions: {rootDir: 'src', outDir: 'out', types: [], skipLibCheck: true},
			files: ['src/current.ts'],
		})
		write(directory, 'src/current.ts', 'export let current = 1\n')
		let orphan = write(directory, 'out/deleted.js', 'old output')
		child = spawn(process.execPath, [path.join(repositoryRoot, 'cli/bin/luc'), '--cache', '--watch'], {
			cwd: directory,
			stdio: ['ignore', 'pipe', 'pipe'],
		})
		closed = new Promise(resolve => child.once('close', resolve))

		await new Promise((resolve, reject) => {
			let timer = setTimeout(() => reject(new Error(output || 'Watch compilation timed out')), 20000)

			/** Wait for successful initial compilation, not merely watcher startup. */
			let read = chunk => {
				output += chunk.toString()
				if (output.includes('Watching for file changes')) {
					clearTimeout(timer)
					resolve()
				}
			}

			child.stdout.on('data', read)
			child.stderr.on('data', read)
			child.once('error', error => {
				clearTimeout(timer)
				reject(error)
			})
			child.once('exit', () => {
				clearTimeout(timer)
				reject(new Error(output || 'Watch compiler exited unexpectedly'))
			})
		})

		assert.ok(!fs.existsSync(orphan))
		assert.ok(output.includes(`Removed "${orphan}".`), output)
		assert.ok(fs.existsSync(path.join(directory, 'out/current.js')))
	}
	finally {
		child?.kill()
		await closed
		fs.rmSync(directory, {recursive: true, force: true})
	}
})
