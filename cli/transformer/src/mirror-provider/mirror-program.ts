import ts from 'typescript'
import {MirrorDocument} from '../lupos-ts-module'


/**
 * Create a mirror document when the secondary Program requests its source.
 * Returning `null` caches that the file must remain its original source.
 */
export type MirrorDocumentProvider = (sourceFile: ts.SourceFile) => MirrorDocument | null

/** Program inputs using a host that supplies mirrored source files lazily. */
interface MirrorProgramSetup {
	rootNames: readonly string[]
	options: ts.CompilerOptions
	host: ts.CompilerHost
	projectReferences: readonly ts.ProjectReference[] | undefined
}

/** Builder programs require a stable version on every source file. */
interface VersionedSourceFile extends ts.SourceFile {
	version?: string
}


/** Create a secondary Program with mirrored sources replacing their originals. */
export function createMirrorProgram(
	realProgram: ts.Program,
	realHost: ts.CompilerHost,
	documents: MirrorDocument | Iterable<MirrorDocument> | MirrorDocumentProvider,
	oldProgram?: ts.Program
): ts.Program {
	let setup = createMirrorProgramSetup(realProgram, realHost, documents, oldProgram, false)

	return ts.createProgram({...setup, oldProgram})
}

/** Create an incremental semantic builder with mirrored sources replacing their originals. */
export function createMirrorBuilderProgram(
	realProgram: ts.Program,
	realHost: ts.CompilerHost,
	documents: MirrorDocument | Iterable<MirrorDocument> | MirrorDocumentProvider,
	oldProgram?: ts.SemanticDiagnosticsBuilderProgram
): ts.SemanticDiagnosticsBuilderProgram {
	let oldSourceProgram = oldProgram?.getProgram()
	let setup = createMirrorProgramSetup(realProgram, realHost, documents, oldSourceProgram, true)

	return ts.createSemanticDiagnosticsBuilderProgram(
		setup.rootNames,
		setup.options,
		setup.host,
		oldProgram,
		undefined,
		setup.projectReferences
	)
}

/** Create the shared mirror host and compiler inputs. */
function createMirrorProgramSetup(
	realProgram: ts.Program,
	realHost: ts.CompilerHost,
	documents: MirrorDocument | Iterable<MirrorDocument> | MirrorDocumentProvider,
	oldProgram: ts.Program | undefined,
	requireSourceVersions: boolean
): MirrorProgramSetup {
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

	// This cache belongs to one mirror Program construction. Canonical names make
	// repeated host calls converge on one entry, while `null` records a completed
	// negative lookup and prevents files without templates from being parsed again.
	let documentsByFile = new Map<string, MirrorDocument | null>(
		documentList.map(document => [canonicalizeFileName(document.fileName, realHost), document])
	)

	let host: ts.CompilerHost = {
		...realHost,

		fileExists(fileName) {

			// Only a non-null cache entry represents a virtual mirrored file. Original
			// and physical sources retain the base host's existence behavior.
			return !!documentsByFile.get(canonicalizeFileName(fileName, realHost))
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

				// Reusing the old SourceFile preserves its parsed AST and the builder's
				// semantic cache. Text equality is safe because a SourceFile is immutable.
				let oldSourceFile = oldProgram?.getSourceFile(fileName)
				if (!shouldCreateNewSourceFile && oldSourceFile?.text === document.mirrorText) {
					return oldSourceFile
				}

				// A changed mirror needs a new AST. Builder Programs additionally require
				// a stable version so they can distinguish it from the previous revision.
				let sourceFile = ts.createSourceFile(fileName, document.mirrorText, languageVersion, true)
				if (requireSourceVersions) {
					setSourceVersion(sourceFile, document.mirrorText)
				}

				return sourceFile
			}

			// Files without mirrors keep the SourceFile owned by the original Program,
			// avoiding a second parse of ordinary TypeScript and declaration files.
			let sourceFile = realProgram.getSourceFile(fileName)
				?? realHost.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)

			if (requireSourceVersions && sourceFile) {
				setSourceVersion(sourceFile, sourceFile.text)
			}

			return sourceFile
		},
	}

	/**
	 * Build and cache a mirror at the point where TypeScript loads its source.
	 *
	 * `has` is intentional: Map.get() cannot distinguish an unseen file from a
	 * cached `null` result. A provider is therefore called at most once per
	 * canonical file for this mirror Program revision.
	 */
	function getDocument(fileName: string): MirrorDocument | null {
		let canonicalName = canonicalizeFileName(fileName, realHost)
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

	return {
		rootNames: realProgram.getRootFileNames(),
		options,
		host,
		projectReferences: realProgram.getProjectReferences(),
	}
}

/**
 * Add the internal version consumed by TypeScript builder programs.
 * The immutable source text is a naturally stable version across revisions.
 */
function setSourceVersion(sourceFile: ts.SourceFile, version: string) {
	let versionedSource = sourceFile as VersionedSourceFile
	versionedSource.version ??= version
}

/** Canonicalize path spelling and case so every physical file has one cache key. */
function canonicalizeFileName(fileName: string, host: ts.CompilerHost): string {
	return host.getCanonicalFileName(ts.sys.resolvePath(fileName))
}
