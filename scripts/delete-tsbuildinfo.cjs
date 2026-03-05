const fs = require('node:fs')


try {
	fs.unlinkSync(__dirname + '/../tests/tsconfig.tsbuildinfo')
	console.log('Deleted "tsconfig.tsbuildinfo".')
}
catch (err) {
	if (err.code !== 'ENOENT') {
		throw err
	}
}