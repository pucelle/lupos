const path = require('node:path')
const {spawnSync} = require('node:child_process')

const repositoryRoot = path.resolve(__dirname, '..')
const compilerPath = path.join(repositoryRoot, 'cli', 'bin', 'luc')

function compile(projectDirectory, args = []) {
	let result = spawnSync(process.execPath, [compilerPath, ...args], {
		cwd: projectDirectory,
		encoding: 'utf8',
	})

	return {
		status: result.status,
		output: result.stdout + result.stderr,
	}
}

module.exports = {repositoryRoot, compile}
