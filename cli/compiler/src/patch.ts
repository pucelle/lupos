import * as ts from 'typescript'


/** Extend of TransformerFactory */
export type ExtendedTransformerFactory = (context: ts.TransformationContext, extras: TransformerExtras) => ts.Transformer<ts.SourceFile>;

/** Extra parameter for compiler transformer. */
export interface TransformerExtras {

	/** If `true`, will add js extension to imports. */
	compileToESM: boolean

	program: ts.BuilderProgram
	compilerDiagnosticModifier: CompilerDiagnosticModifier
}


/** Patch program host and bundle with extended transformer. */
export function patchHost(
	host: ts.SolutionBuilderHostBase<ts.EmitAndSemanticDiagnosticsBuilderProgram>
		| ts.SolutionBuilderWithWatchHost<ts.EmitAndSemanticDiagnosticsBuilderProgram>,
	extended: ExtendedTransformerFactory,
	toESM: boolean,
	diagModifier: CompilerDiagnosticModifier
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
	diagModifier: CompilerDiagnosticModifier
) {
	let standardTransformer: ts.TransformerFactory<ts.SourceFile> = (context: ts.TransformationContext) => {
		let extras: TransformerExtras = {
			compileToESM: toESM,
			program: program!,	// Use newly updated program.
			compilerDiagnosticModifier: diagModifier,
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
		diagModifier.reportAdded()

		return emitResult
	}
}


interface DiagnosticLike {
	file?: ts.SourceFile,
	start: number | undefined,
	code: number
}


export class CompilerDiagnosticModifier {

	private reporter: ts.DiagnosticReporter | null = null

	/** Don't know why reporting for twice in watch mode, use this to avoid it. */
	private reportedDiags: Set<ts.Diagnostic> = new Set()

	/** They are not using source file as key, because source files may be updated without re-compiling. */
	private added: Map<string, ts.Diagnostic[]> = new Map()
	private deleted: Map<string, DiagnosticLike[]> = new Map()
	private potentialAllImportsUnUsed: Map<string, ts.ImportDeclaration[]> = new Map()

	/** Check whether diagnostic has been deleted. */
	hasDeleted(diag: DiagnosticLike): boolean {
		if (!diag.file) {
			return false
		}

		let deletedDiags = this.deleted.get(diag.file.fileName)
		if (!deletedDiags) {
			return false
		}

		return this.testExistingIn(diag, deletedDiags)
	}

	/** Note it doesn't validate filename. */
	private testExistingIn(diag: ts.Diagnostic | DiagnosticLike, list: DiagnosticLike[]): boolean {
		return !!list.find(d => d.start === diag.start && d.code === diag.code)
	}

	/** Get added diagnostic count. */
	getAddedCount(): number {
		let count = 0
		for (let diags of this.added.values()) {
			count += diags.length
		}
		return count
	}

	/** Add custom diagnostics. */
	add(fileName: string, diags: ts.Diagnostic[], program: ts.BuilderProgram) {
		if (diags.length === 0) {
			return
		}

		// A dirty hack.
		let state = (program as any).state
		if (state && state.semanticDiagnosticsPerFile) {

			// State use lower key
			let lowerFileName = fileName.toLowerCase()

			let diagsOfFile = state.semanticDiagnosticsPerFile.get(lowerFileName) as ts.Diagnostic[] | undefined
			if (diagsOfFile) {
				diagsOfFile.push(...diags)
			}
		}

		this.added.set(fileName, diags)
	}

	/** Delete diagnostics. */
	delete(fileName: string, diags: DiagnosticLike[], program: ts.BuilderProgram) {
		if (diags.length === 0) {
			return
		}

		// A dirty hack.
		let state = (program as any).state
		if (state && state.semanticDiagnosticsPerFile) {

			// State use lower key
			let lowerFileName = fileName.toLowerCase()

			let diagsOfFile = state.semanticDiagnosticsPerFile.get(lowerFileName) as ts.Diagnostic[] | undefined
			if (diagsOfFile && diagsOfFile.length > 0) {
				let newDiagsOfFile = diagsOfFile.filter(diagOfFile => this.testExistingIn(diagOfFile, diags))
				if (newDiagsOfFile.length !== diagsOfFile.length) {
					state.semanticDiagnosticsPerFile.set(lowerFileName, newDiagsOfFile)
				}
			}
		}

		this.deleted.set(fileName, diags)
	}

	/** Set potential all imports which . */
	setPotentialAllImportsUnUsed(fileName: string, decls: ts.ImportDeclaration[]) {
		this.potentialAllImportsUnUsed.set(fileName, decls)
	}

	/** Patch diagnostic reporter to do filtering. */
	patchDiagnosticReporter(reporter: ts.DiagnosticReporter): ts.DiagnosticReporter {
		this.reporter = reporter

		// The ts internal logic `emitFilesAndReportErrors` get semantic diags firstly,
		// then run transformer, and join with program diagnostics.
		// So here we must exclude
		return (diag: ts.Diagnostic) => {
			if (!this.hasDeleted(diag) && !this.reportedDiags.has(diag)) {
				reporter(diag)
				this.reportedDiags.add(diag)
			}
			else if (diag.file) {
				let usUsedSiblingImportDiags = this.getUnUsedSiblingImportDiags(diag.file, diag.start!)

				for(let diag of usUsedSiblingImportDiags) {
					this.reporter!(diag)
				}
			}
		}
	}

	private getUnUsedSiblingImportDiags(sourceFile: ts.SourceFile, start: number): ts.Diagnostic[] {
		let unUsedDecls = this.potentialAllImportsUnUsed.get(sourceFile.fileName)
		if (!unUsedDecls) {
			return []
		}

		let importDecl = unUsedDecls.find(decl => decl.getStart() === start)
		if (!importDecl) {
			return []
		}

		let unImported: ts.Diagnostic[] = []

		for (let element of (importDecl.importClause!.namedBindings! as ts.NamedImports).elements) {
			if (!this.hasDeleted({file: sourceFile, start: element.name.getStart(), code: 6133})) {
				let start = element.name.getStart()
				let length = element.name.getEnd() - start

				let diag: ts.Diagnostic = {
					category: ts.DiagnosticCategory.Error,
					code: 6133,
					messageText: `'${element.name.text}' is declared but its value is never read.`,
					file: sourceFile,
					start,
					length,
				}

				unImported.push(diag)
			}
		}
		
		return unImported
	}

	/** 
	 * Patch watch status reporter to do filtering.
	 * When update in watch mode, this will be called for multiple times.
	 */
	patchWatchStatusReporter(reporter: ts.WatchStatusReporter): ts.WatchStatusReporter {
		return (diagnostic: ts.Diagnostic, newLine: string, options: ts.CompilerOptions, errorCount?: number) => {
			let countAfterModified = this.reportedDiags.size + this.getAddedCount()

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
		this.added.delete(file.fileName)
		this.deleted.delete(file.fileName)
	}

	/** Report all added diagnostics. */
	reportAdded() {
		for (let diags of this.added.values()) {
			for (let diag of diags) {
				this.reporter!(diag)
			}
		}
	}
}