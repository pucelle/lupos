import * as ts from 'typescript'
import {ListMap} from './utils'


/** Extend of TransformerFactory */
export type ExtendedTransformerFactory = (context: ts.TransformationContext, extras: TransformerExtras) => ts.Transformer<ts.SourceFile>;

/** Extra parameter for compiler transformer. */
export interface TransformerExtras {

	/** If `true`, will add js extension to imports. */
	compileToESM: boolean

	program: ts.BuilderProgram
	diagnosticModifier: DiagnosticModifier
}


/** Patch program host and bundle with extended transformer. */
export function patchHost(
	host: ts.SolutionBuilderHostBase<ts.EmitAndSemanticDiagnosticsBuilderProgram>
		| ts.SolutionBuilderWithWatchHost<ts.EmitAndSemanticDiagnosticsBuilderProgram>,
	extended: ExtendedTransformerFactory,
	toESM: boolean,
	diagModifier: DiagnosticModifier
) {
	let originalHostCreateProgram = host.createProgram

	// Note program may update here.
	host.createProgram = (rootNames: readonly string[] | undefined, options, host, oldProgram) => {
		let program = originalHostCreateProgram(rootNames, options, host, oldProgram)
		patchProgram(program, extended, toESM, diagModifier)

		return program
	}
}


/** Patch program and bundle with extended transformer. */
export function patchProgram(
	program: ts.EmitAndSemanticDiagnosticsBuilderProgram,
	extended: ExtendedTransformerFactory,
	toESM: boolean,
	diagModifier: DiagnosticModifier
) {
	let standardTransformer: ts.TransformerFactory<ts.SourceFile> = (context: ts.TransformationContext) => {
		let extras: TransformerExtras = {
			compileToESM: toESM,
			program: program!,	// Use newly updated program.
			diagnosticModifier: diagModifier,
		}

		return extended(context, extras)
	}

	let originalEmit = program.emit

	program.emit = (targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, existingTransformers): ts.EmitResult => {
		let transformers = existingTransformers ?? { before: [] }

		if (!transformers.before) {
			transformers.before = []
		}

		// Add our transformer.
		transformers.before.push(standardTransformer)

		let emitResult = originalEmit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, transformers)

		// Report added diagnostics.
		diagModifier.reportAdded();

		return emitResult
	}
}


export class DiagnosticModifier {

	private reporter: ts.DiagnosticReporter | null = null

	/** Don't know why reporting for twice in watch mode, use this to avoid it. */
	private reportedDiags: Set<ts.Diagnostic> = new Set()

	/** They are not using source file as key, because source files may be updated without re-compiling. */
	private added: ListMap<string, ts.Diagnostic> = new ListMap()
	private deleted: ListMap<string, {start: number, code: number}> = new ListMap()

	/** Patch diagnostic reporter to do filtering. */
	patchDiagnosticReporter(reporter: ts.DiagnosticReporter): ts.DiagnosticReporter {
		this.reporter = reporter

		return (diag: ts.Diagnostic) => {
			if (!this.hasDeleted(diag) && !this.reportedDiags.has(diag)) {
				reporter(diag)
				this.reportedDiags.add(diag)
			}
		}
	}

	/** 
	 * Patch watch status reporter to do filtering.
	 * When update in watch mode, this will be called for multiple times.
	 */
	patchWatchStatusReporter(reporter: ts.WatchStatusReporter): ts.WatchStatusReporter {
		return (diagnostic: ts.Diagnostic, newLine: string, options: ts.CompilerOptions, errorCount?: number) => {
			let countAfterModified = this.reportedDiags.size + this.added.valueCount()

			if (typeof diagnostic.messageText === 'string') {
				diagnostic.messageText = diagnostic.messageText.replace(/\d+/, countAfterModified.toString())
			}
			else {
				diagnostic.messageText.messageText = diagnostic.messageText.messageText.replace(/\d+/, countAfterModified.toString())
			}

			reporter(diagnostic, newLine, options, errorCount)
			this.reportedDiags.clear()
		}
	}

	/** Before visit a source file, clean all the modification of it. */
	beforeVisitSourceFile(file: ts.SourceFile) {
		this.added.deleteOf(file.fileName)
		this.deleted.deleteOf(file.fileName)
	}

	/** Report all added diagnostics. */
	reportAdded() {
		for (let diag of this.added.values()) {
			this.reporter!(diag)
		}
	}

	/** Check whether diagnostic has been deleted. */
	hasDeleted(diag: ts.Diagnostic): boolean {
		if (!diag.file) {
			return false
		}

		let deletedDiags = this.deleted.get(diag.file.fileName)
		if (!deletedDiags) {
			return false
		}

		return !!deletedDiags.find(d => d.start === diag.start && d.code === diag.code)
	}

	/** Add a custom diagnostic. */
	add(diag: ts.Diagnostic) {
		if (diag.file) {
			this.added.add(diag.file.fileName, diag)
		}
	}

	/** Delete a diagnostic. */
	delete(fileName: string, diag: {start: number, code: number}) {
		this.deleted.add(fileName, diag)
	}
}