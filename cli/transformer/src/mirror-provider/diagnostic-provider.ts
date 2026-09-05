import ts from 'typescript'
import type {CompilerDiagnosticProvider, CompilerDiagnosticProviderFactory} from '../../../compiler/out/patch'
import {
	mapMirrorSpanToOriginal,
	MirrorDocument,
} from '../lupos-ts-module/ts-mirror'
import {getMirrorSemanticService, MirrorSemanticService} from './semantic-service'


/** Create one cached mirror diagnostic service for a real Program. */
export const createLuposMirrorDiagnosticProvider: CompilerDiagnosticProviderFactory = (program, host, previousProgram) => {
	return new LuposMirrorDiagnosticProvider(program, host, previousProgram)
}

/** To mirror original typescript program diagnostics. */
class LuposMirrorDiagnosticProvider implements CompilerDiagnosticProvider {

	private readonly service: MirrorSemanticService
	private readonly diagnosticsCache: WeakMap<ts.SourceFile, readonly ts.Diagnostic[] | null> = new WeakMap()

	constructor(program: ts.Program, host: ts.CompilerHost, previousProgram?: ts.Program) {
		this.service = getMirrorSemanticService(program, host, previousProgram)
	}

	getSemanticDiagnostics(sourceFile: ts.SourceFile, cancellationToken?: ts.CancellationToken): readonly ts.Diagnostic[] | null {
		let cached = this.diagnosticsCache.get(sourceFile)
		if (cached !== undefined) {
			return cached
		}

		if (sourceFile.isDeclarationFile) {
			this.diagnosticsCache.set(sourceFile, null)
			return null
		}

		cancellationToken?.throwIfCancellationRequested()

		let context = this.service.getContext(sourceFile)
		if (!context) {
			this.diagnosticsCache.set(sourceFile, null)
			return null
		}

		let {document, program: mirrorProgram, sourceFile: mirrorSourceFile} = context
		
		let diagnostics = mirrorProgram.getSemanticDiagnostics(mirrorSourceFile, cancellationToken)
			.map(diagnostic => mapDiagnostic(diagnostic, document, sourceFile, mirrorSourceFile))
			.filter((diagnostic): diagnostic is ts.Diagnostic => diagnostic !== null)

		this.diagnosticsCache.set(sourceFile, diagnostics)
		return diagnostics
	}
}

function mapDiagnostic(
	diagnostic: ts.Diagnostic,
	document: MirrorDocument,
	realSourceFile: ts.SourceFile,
	mirrorSourceFile: ts.SourceFile
): ts.Diagnostic | null {
	if (diagnostic.start === undefined) {
		return diagnostic.file === mirrorSourceFile
			? {...diagnostic, file: realSourceFile}
			: diagnostic
	}

	let span = mapMirrorSpanToOriginal(document, {
		start: diagnostic.start,
		length: diagnostic.length ?? 0,
	}, 'diagnostic')

	if (!span) {
		return null
	}

	return {
		...diagnostic,
		file: realSourceFile,
		start: span.start,
		length: span.length,
		relatedInformation: diagnostic.relatedInformation
			?.map(related => mapRelatedInformation(related, document, realSourceFile, mirrorSourceFile))
			.filter((related): related is ts.DiagnosticRelatedInformation => related !== null),
	}
}

function mapRelatedInformation(
	diagnostic: ts.DiagnosticRelatedInformation,
	document: MirrorDocument,
	realSourceFile: ts.SourceFile,
	mirrorSourceFile: ts.SourceFile
): ts.DiagnosticRelatedInformation | null {
	if (diagnostic.file !== mirrorSourceFile) {
		return diagnostic
	}

	if (diagnostic.start === undefined) {
		return {...diagnostic, file: realSourceFile}
	}

	let span = mapMirrorSpanToOriginal(document, {
		start: diagnostic.start,
		length: diagnostic.length ?? 0,
	}, 'diagnostic')

	return span
		? {...diagnostic, file: realSourceFile, start: span.start, length: span.length}
		: null
}
