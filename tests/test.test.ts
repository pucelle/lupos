import * as fs from 'fs'
import * as path from 'path'


/** Walk across files and sub files of a directory. */
async function* walkFiles(dirPath: string): AsyncGenerator<string> {
    for await (let dir of await fs.promises.opendir(dirPath)) {
        let entry = path.join(dirPath, dir.name)

        if (dir.isDirectory()) {
			yield* walkFiles(entry)
		}
        else if (dir.isFile()) {
			yield entry
		}
    }
}

describe('Test output files', () => {

	test('output files', async () => {
		let expDir = path.join(__dirname, 'expect')
		let outDir = path.join(__dirname, 'out')

		for await (let expFilePath of walkFiles(expDir)) {
			let outFilePath = path.join(outDir, path.relative(expFilePath, expDir))
			let expText = await fs.promises.readFile(expFilePath)
			let outText = await fs.promises.readFile(outFilePath)

			expect(expText).toEqual(outText)
		}
	})
})