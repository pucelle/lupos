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

/** Interpolate program host and bundle with extended TransformerFactory to give a standard TransformerFactory. */
export function interpolateTransformer(
	host: ts.SolutionBuilderHostBase<any>,
	diagnosticModifier: DiagnosticModifier,
	extended: ExtendedTransformerFactory,
	toESM: boolean
):
	ts.TransformerFactory<ts.SourceFile>
{
	const originalHostCreateProgram = host.createProgram;
	let program: ts.BuilderProgram | null = null;
	
	// Note program may update here.
	host.createProgram = (rootNames: readonly string[] | undefined, options, host, oldProgram) => {
		return program = originalHostCreateProgram(rootNames, options, host, oldProgram);
	}

	return (context: ts.TransformationContext) => {
		let extras: TransformerExtras = {
			compileToESM: toESM,
			program: program!,
			diagnosticModifier,
		}

		return extended(context, extras)
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