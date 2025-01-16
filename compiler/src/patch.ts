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
	private total: ReadonlyArray<ts.Diagnostic> = []

	/** They are not using source file as key, because source files may be updated without re-compiling. */
	private bySourceFile: ListMap<string, ts.Diagnostic> = new ListMap()
	private added: ListMap<string, ts.Diagnostic> = new ListMap()
	private deleted: ListMap<string, ts.Diagnostic> = new ListMap()

	/** Patch diagnostic reporter to do filtering. */
	patchDiagnosticReporter(reporter: ts.DiagnosticReporter): ts.DiagnosticReporter {
		this.reporter = reporter

		return (diag: ts.Diagnostic) => {
			if (!this.hasDeleted(diag)) {
				reporter(diag)
			}
		}
	}

	/** 
	 * Patch watch status reporter to do filtering.
	 * When update in watch mode, this will be called for multiple times.
	 */
	patchWatchStatusReporter(reporter: ts.WatchStatusReporter): ts.WatchStatusReporter {
		return (diagnostic: ts.Diagnostic, newLine: string, options: ts.CompilerOptions, errorCount?: number) => {
			let diagCount = this.total.length
			let countAfterModified = diagCount + this.added.valueCount() - this.deleted.valueCount()

			if (diagCount !== countAfterModified) {
				if (typeof diagnostic.messageText === 'string') {
					diagnostic.messageText = diagnostic.messageText.replace(/\d+/, countAfterModified.toString())
				}
				else {
					diagnostic.messageText.messageText = diagnostic.messageText.messageText.replace(/\d+/, countAfterModified.toString())
				}
			}

			reporter(diagnostic, newLine, options, errorCount)
		}
	}

	/** 
	 * Before next build, clear all the expired source files.
	 * 
	 * This method is now working as expected,
	 * because watch compiler program may only active
	 * partial files when doing watching,
	 * but diagnostics still contain those not included files.
	 * 
	 * So must also check source files exist on diagnostics.
	 */
	updateTotal(sourceFiles: ReadonlyArray<ts.SourceFile>, diags: ReadonlyArray<ts.Diagnostic>) {
		let set = new Set(sourceFiles.map(f => f.fileName))

		for (let diag of diags) {
			if (diag.file) {
				set.add(diag.file.fileName)
			}
		}

		// This list includes changed file, and all the files that import it.
		let expired = [...this.bySourceFile.keys()].filter(file => !set.has(file))

		for (let fileName of expired) {
			this.bySourceFile.deleteOf(fileName)
			this.added.deleteOf(fileName)
			this.deleted.deleteOf(fileName)
		}

		this.updateTotalDiagnostics(diags)
	}

	/** Update total diagnostics before each time building. */
	private updateTotalDiagnostics(total: ReadonlyArray<ts.Diagnostic>) {
		this.total = total
		this.bySourceFile.clear()
		
		for (let diag of total) {
			let file = diag.file
			if (!file) {
				continue
			}

			this.bySourceFile.add(file.fileName, diag)
		}
	}

	/** Before visit a source file, clean all the modification of it. */
	beforeVisitSourceFile(file: ts.SourceFile) {
		this.bySourceFile.deleteOf(file.fileName)
		this.added.deleteOf(file.fileName)
		this.deleted.deleteOf(file.fileName)
	}

	/** Report all added diagnostics. */
	reportAdded() {
		for (let diag of this.added.values()) {
			this.reporter!(diag)

			if (diag.file) {
				this.bySourceFile.add(diag.file.fileName, diag)
			}
		}
	}

	/** Get diagnostics of a source file. */
	getOfFile(file: ts.SourceFile): ts.Diagnostic[] | undefined {
		return this.bySourceFile.get(file.fileName)
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
	delete(diag: ts.Diagnostic) {
		if (diag.file) {
			this.deleted.add(diag.file.fileName, diag)
		}
	}
}