import {unlink} from 'node:fs/promises'


try {
	await unlink('tests/tsconfig.tsbuildinfo')
	console.log('Deleted tsconfig.tsbuildinfo.')
}
catch (err) {
	if (err.code !== 'ENOENT') {
		throw err
	}
}