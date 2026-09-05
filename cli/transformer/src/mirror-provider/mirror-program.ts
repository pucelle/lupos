import ts from 'typescript'
import {MirrorDocument} from '../lupos-ts-module'


/** Create a secondary Program with mirrored sources replacing their originals. */
export function createMirrorProgram(
	realProgram: ts.Program,
	realHost: ts.CompilerHost,
	documents: MirrorDocument | Iterable<MirrorDocument>
): ts.Program {
	let options = realProgram.getCompilerOptions()

	let documentList = 'mirrorText' in documents
		? [documents]
		: [...documents]

	let documentsByFile = new Map(documentList.map(document => [canonicalize(document.fileName, realHost), document]))
	let host: ts.CompilerHost = {
		...realHost,

		fileExists(fileName) {
			return documentsByFile.has(canonicalize(fileName, realHost))
				|| !!realProgram.getSourceFile(fileName)
				|| realHost.fileExists(fileName)
		},

		readFile(fileName) {
			let document = documentsByFile.get(canonicalize(fileName, realHost))
			if (document) {
				return document.mirrorText
			}

			return realProgram.getSourceFile(fileName)?.text ?? realHost.readFile(fileName)
		},

		getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile) {
			let document = documentsByFile.get(canonicalize(fileName, realHost))
			if (document) {
				return ts.createSourceFile(fileName, document.mirrorText, languageVersion, true)
			}

			return realProgram.getSourceFile(fileName)
				?? realHost.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
		},
	}

	return ts.createProgram({
		rootNames: realProgram.getRootFileNames(),
		options,
		host,
		projectReferences: realProgram.getProjectReferences(),
	})
}

function canonicalize(fileName: string, host: ts.CompilerHost): string {
	return host.getCanonicalFileName(ts.sys.resolvePath(fileName))
}
