import ts from 'typescript'
import {MirrorDocument} from '../lupos-ts-module'


/** Create a mirror document when the secondary Program requests its source. */
export type MirrorDocumentProvider = (sourceFile: ts.SourceFile) => MirrorDocument | null


/** Create a secondary Program with mirrored sources replacing their originals. */
export function createMirrorProgram(
	realProgram: ts.Program,
	realHost: ts.CompilerHost,
	documents: MirrorDocument | Iterable<MirrorDocument> | MirrorDocumentProvider
): ts.Program {
	let options = realProgram.getCompilerOptions()
	let provider = typeof documents === 'function' ? documents : null
	let documentList: MirrorDocument[]
	if (typeof documents === 'function') {
		documentList = []
	}
	else if ('mirrorText' in documents) {
		documentList = [documents]
	}
	else {
		documentList = [...documents]
	}

	let documentsByFile = new Map<string, MirrorDocument | null>(
		documentList.map(document => [canonicalize(document.fileName, realHost), document])
	)
	let host: ts.CompilerHost = {
		...realHost,

		fileExists(fileName) {
			return !!documentsByFile.get(canonicalize(fileName, realHost))
				|| !!realProgram.getSourceFile(fileName)
				|| realHost.fileExists(fileName)
		},

		readFile(fileName) {
			let document = getDocument(fileName)
			if (document) {
				return document.mirrorText
			}

			return realProgram.getSourceFile(fileName)?.text ?? realHost.readFile(fileName)
		},

		getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile) {
			let document = getDocument(fileName)
			if (document) {
				return ts.createSourceFile(fileName, document.mirrorText, languageVersion, true)
			}

			return realProgram.getSourceFile(fileName)
				?? realHost.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
		},
	}

	/** Build and cache a mirror at the point where TypeScript loads its source. */
	function getDocument(fileName: string): MirrorDocument | null {
		let canonicalName = canonicalize(fileName, realHost)
		if (documentsByFile.has(canonicalName)) {
			return documentsByFile.get(canonicalName)!
		}

		let sourceFile = realProgram.getSourceFile(fileName)
		let document = sourceFile && provider
			? provider(sourceFile)
			: null

		documentsByFile.set(canonicalName, document)
		return document
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
