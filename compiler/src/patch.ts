import * as ts from 'typescript'
import {ListMap, WeakListMap} from './utils';


/** Extend of TransformerFactory */
export type ExtendedTransformerFactory = (context: ts.TransformationContext, extras: TransformerExtras) => ts.Transformer<ts.SourceFile>;

/** Extra parameter for compiler transformer. */
export interface TransformerExtras {
	program: ts.BuilderProgram
	diagnosticModifier: DiagnosticModifier
}

/** Interpolate program host and bundle with extended TransformerFactory to give a standard TransformerFactory. */
export function interpolateHostCreateProgram(
	host: ts.SolutionBuilderHostBase<any>,
	diagnosticModifier: DiagnosticModifier,
	extendedList: ExtendedTransformerFactory[]
):
	ts.TransformerFactory<ts.SourceFile>[]
{
	const originalHostCreateProgram = host.createProgram;
	let program: ts.BuilderProgram | null = null;
	
	host.createProgram = (rootNames: readonly string[] | undefined, options, host, oldProgram) => {
		return program = originalHostCreateProgram(rootNames, options, host, oldProgram);
	};

	return extendedList.map(extended => {
		return (context: ts.TransformationContext) => {
			let extras: TransformerExtras = {
				program: program!,
				diagnosticModifier,
			}

			return extended(context, extras);
		};
	})
}


export class DiagnosticModifier {

	private reporter: ts.DiagnosticReporter | null = null
	private total: ReadonlyArray<ts.Diagnostic> = []
	private bySourceFile: WeakListMap<ts.SourceFile, ts.Diagnostic> = new WeakListMap()
	private added: ListMap<ts.SourceFile, ts.Diagnostic> = new ListMap()
	private deleted: ListMap<ts.SourceFile, ts.Diagnostic> = new ListMap()

	/** Patch diagnostic reporter to do filtering. */
	patchDiagnosticReporter(reporter: ts.DiagnosticReporter): ts.DiagnosticReporter {
		this.reporter = reporter

		return (diagnostic: ts.Diagnostic) => {
			if (!this.hasDeleted(diagnostic)) {
				reporter(diagnostic)
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
					diagnostic.messageText =diagnostic.messageText.replace(/\d+/, countAfterModified.toString())
				}
				else {
					diagnostic.messageText.messageText = diagnostic.messageText.messageText.replace(/\d+/, countAfterModified.toString())
				}
			}

			reporter(diagnostic, newLine, options, errorCount)
		}
	}

	/** Before transform a source file, clear all the messages modified. */
	beforeVisitSourceFile(file: ts.SourceFile) {
		this.added.deleteOf(file)
		this.deleted.deleteOf(file)
	}

	/** Report all added diagnostics. */
	reportAdded() {
		for (let diag of this.added.values()) {
			this.reporter!(diag)
		}
	}

	/** Update total diagnostics before each time building. */
	updateTotal(total: ReadonlyArray<ts.Diagnostic>) {
		this.total = total
		this.bySourceFile.clear()
		
		for (let diag of total) {
			let file = diag.file
			if (!file) {
				continue
			}

			this.bySourceFile.add(file, diag)
		}
	}

	/** Get diagnostics of a source file. */
	getOfFile(file: ts.SourceFile): ts.Diagnostic[] | undefined {
		return this.bySourceFile.get(file)
	}

	/** Check whether diagnostic has been deleted. */
	hasDeleted(diag: ts.Diagnostic): boolean {
		if (!diag.file) {
			return false
		}

		return this.deleted.has(diag.file, diag)
	}

	/** Add a custom diagnostic. */
	add(diag: ts.Diagnostic) {
		if (diag.file) {
			this.added.add(diag.file, diag)
		}
	}

	/** Delete a diagnostic. */
	delete(diag: ts.Diagnostic) {
		if (diag.file) {
			this.deleted.add(diag.file, diag)
		}
	}
}