import ts from 'typescript'
import {MirrorDocument} from '../lupos-ts-module'


/** Create a secondary Program with only the active source replaced by its insertion-only mirror. */
export function createMirrorProgram(
	realProgram: ts.Program,
	realHost: ts.CompilerHost,
	document: MirrorDocument
): ts.Program {
	let options = realProgram.getCompilerOptions()
	let canonicalTarget = canonicalize(document.fileName, realHost)
	let host: ts.CompilerHost = {
		...realHost,

		fileExists(fileName) {
			return canonicalize(fileName, realHost) === canonicalTarget
				|| !!realProgram.getSourceFile(fileName)
				|| realHost.fileExists(fileName)
		},

		readFile(fileName) {
			if (canonicalize(fileName, realHost) === canonicalTarget) {
				return document.mirrorText
			}

			return realProgram.getSourceFile(fileName)?.text ?? realHost.readFile(fileName)
		},

		getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile) {
			if (canonicalize(fileName, realHost) === canonicalTarget) {
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
