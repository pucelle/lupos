#!/usr/bin/env node

if (require.main === module) {
	require('../compiler/out/index.js')
}
else {
	throw new Error('luc must be run as a CLI!')
}