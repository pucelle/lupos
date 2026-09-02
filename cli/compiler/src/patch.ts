import ts from 'typescript'


/** Extend of TransformerFactory */
export type ExtendedTransformerFactory = (context: ts.TransformationContext, extras: TransformerExtras) => ts.Transformer<ts.SourceFile>;

/** Extra parameter for compiler transformer. */
export interface TransformerExtras {

	/** If `true`, will add js extension to imports. */
	compileToESM: boolean

	/** If `true`, will embed svg imports to code string inline. */
	embedSVG: boolean

	program: ts.BuilderProgram
	compilerDiagnosticModifier: CompilerDiagnosticModifier
}


/** Patch program host and bundle with extended transformer. */
export function patchHost(
	host: ts.SolutionBuilderHostBase<ts.EmitAndSemanticDiagnosticsBuilderProgram>
		| ts.SolutionBuilderWithWatchHost<ts.EmitAndSemanticDiagnosticsBuilderProgram>,
	extended: ExtendedTransformerFactory,
	compileToESM: boolean,
	embedSVG: boolean,
	diagModifier: CompilerDiagnosticModifier
) {
	let originalHostCreateProgram = host.createProgram.bind(host)

	// Note program may update here.
	host.createProgram = (rootNames: readonly string[] | undefined, options, host, oldProgram) => {
		let program = originalHostCreateProgram(rootNames, options, host, oldProgram)
		patchProgram(program, extended, compileToESM, embedSVG, diagModifier)

		return program
	}
}


/** Patch program and bundle with extended transformer. */
export function patchProgram(
	program: ts.EmitAndSemanticDiagnosticsBuilderProgram,
	extended: ExtendedTransformerFactory,
	compileToESM: boolean,
	embedSVG: boolean,
	diagModifier: CompilerDiagnosticModifier
) {
	let standardTransformer: ts.TransformerFactory<ts.SourceFile> = (context: ts.TransformationContext) => {
		let extras: TransformerExtras = {
			compileToESM,
			embedSVG,
			program: program!,	// Use newly updated program.
			compilerDiagnosticModifier: diagModifier,
		}

		return extended(context, extras)
	}

	let deferredSemanticDiagnostics: ts.Diagnostic[] = []
	let emitting = false
	let originalGetSemanticDiagnostics = program.getSemanticDiagnostics.bind(program)
	let originalEmit = program.emit.bind(program)

	// `emitFilesAndReportErrors` asks for semantic diagnostics before emitting.
	// Defer those diagnostics until emit finishes, when the transformer has
	// supplied its additions and deletions. Both methods are public BuilderProgram
	// APIs, so this does not depend on TypeScript's internal builder state.
	program.getSemanticDiagnostics = (sourceFile, cancellationToken) => {
		let diagnostics = originalGetSemanticDiagnostics(sourceFile, cancellationToken)
		if (emitting || program.getCompilerOptions().listFilesOnly) {
			return diagnostics
		}

		deferredSemanticDiagnostics.push(...diagnostics)
		return []
	}

	program.emit = (targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, existingTransformers): ts.EmitResult => {
		let transformers: ts.CustomTransformers = {
			...existingTransformers,
			before: [...existingTransformers?.before ?? [], standardTransformer],
		}

		emitting = true
		let emitResult: ts.EmitResult
		try {
			emitResult = originalEmit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, transformers)
		}
		finally {
			emitting = false
		}

		let diagnostics = diagModifier.modifyDiagnostics(
			program,
			[...deferredSemanticDiagnostics, ...emitResult.diagnostics]
		)
		deferredSemanticDiagnostics = []

		return {...emitResult, diagnostics}
	}
}


interface DiagnosticLike {
	file?: ts.SourceFile,
	start: number | undefined,
	code: number
}


export class CompilerDiagnosticModifier {

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

	/** Add custom diagnostics. */
	add(fileName: string, diags: ts.Diagnostic[]) {
		if (diags.length === 0) {
			return
		}

		this.added.set(fileName, diags)
	}

	/** Delete diagnostics. */
	delete(fileName: string, diags: DiagnosticLike[]) {
		if (diags.length === 0) {
			return
		}

		this.deleted.set(fileName, diags)
	}

	/** Set potential all imports which . */
	setPotentialAllImportsUnUsed(fileName: string, decls: ts.ImportDeclaration[]) {
		this.potentialAllImportsUnUsed.set(fileName, decls)
	}

	/** Apply transformer additions and deletions to diagnostics through public APIs. */
	modifyDiagnostics(program: ts.BuilderProgram, diagnostics: readonly ts.Diagnostic[]): ts.Diagnostic[] {
		let sourceFileNames = new Set(program.getSourceFiles().map(file => file.fileName))
		let modified: ts.Diagnostic[] = []

		for (let diag of diagnostics) {
			if (!this.hasDeleted(diag)) {
				modified.push(diag)
			}
			else if (diag.file && diag.start !== undefined) {
				modified.push(...this.getUnUsedSiblingImportDiags(diag.file, diag.start))
			}
		}

		for (let [fileName, added] of this.added) {
			if (sourceFileNames.has(fileName)) {
				modified.push(...added)
			}
		}

		return modified
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

	/** Before visit a source file, clean all the modification of it. */
	beforeVisitSourceFile(file: ts.SourceFile) {
		this.added.delete(file.fileName)
		this.deleted.delete(file.fileName)
		this.potentialAllImportsUnUsed.delete(file.fileName)
	}
}
