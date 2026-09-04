import ts from 'typescript'


/** Extend of TransformerFactory */
export type ExtendedTransformerFactory = (context: ts.TransformationContext, extras: TransformerExtras) => ts.Transformer<ts.SourceFile>;

/** Supplies replacement semantic diagnostics without coupling the compiler to Lupos syntax. */
export interface CompilerDiagnosticProvider {
	/** Return `null` when this source has no mirror and native diagnostics should be used. */
	getSemanticDiagnostics(sourceFile: ts.SourceFile, cancellationToken?: ts.CancellationToken): readonly ts.Diagnostic[] | null
}

export type CompilerDiagnosticProviderFactory = (
	program: ts.Program,
	host: ts.CompilerHost
) => CompilerDiagnosticProvider

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
	diagModifier: CompilerDiagnosticModifier,
	diagnosticProviderFactory?: CompilerDiagnosticProviderFactory
) {
	let originalHostCreateProgram = host.createProgram.bind(host)

	// Note program may update here.
	host.createProgram = (rootNames: readonly string[] | undefined, options, compilerHost, oldProgram) => {
		let program = originalHostCreateProgram(rootNames, options, compilerHost, oldProgram)

		let diagnosticProvider = compilerHost
			? diagnosticProviderFactory?.(program.getProgram(), compilerHost)
			: undefined

		patchProgram(program, extended, compileToESM, embedSVG, diagModifier, diagnosticProvider)

		return program
	}
}


/** Patch program and bundle with extended transformer. */
export function patchProgram(
	program: ts.EmitAndSemanticDiagnosticsBuilderProgram,
	extended: ExtendedTransformerFactory,
	compileToESM: boolean,
	embedSVG: boolean,
	diagModifier: CompilerDiagnosticModifier,
	diagnosticProvider?: CompilerDiagnosticProvider
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

	let deferredSemanticDiagnostics: Map<string, readonly ts.Diagnostic[]> = new Map()
	let emitting = false
	let originalGetSemanticDiagnostics = program.getSemanticDiagnostics.bind(program)
	let originalEmit = program.emit.bind(program)

	// `emitFilesAndReportErrors` asks for semantic diagnostics before emitting.
	// Defer those diagnostics until emit finishes, when the transformer has
	// supplied its additions and deletions. Both methods are public BuilderProgram
	// APIs, so this does not depend on TypeScript's internal builder state.
	program.getSemanticDiagnostics = (sourceFile, cancellationToken) => {
		if (emitting || program.getCompilerOptions().listFilesOnly) {
			return originalGetSemanticDiagnostics(sourceFile, cancellationToken)
		}

		let diagnostics = sourceFile
			? diagnosticProvider?.getSemanticDiagnostics(sourceFile, cancellationToken)
				?? originalGetSemanticDiagnostics(sourceFile, cancellationToken)
			: replaceMirroredDiagnostics(
				program,
				originalGetSemanticDiagnostics(undefined, cancellationToken),
				diagnosticProvider,
				cancellationToken
			)

		deferredSemanticDiagnostics.set(sourceFile?.fileName ?? '', diagnostics)
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
			[...deferredSemanticDiagnostics.values()].flat().concat(emitResult.diagnostics)
		)

		deferredSemanticDiagnostics.clear()

		return {...emitResult, diagnostics}
	}
}

/** We will totally replace original diagnostics per source file. */
function replaceMirroredDiagnostics(
	program: ts.BuilderProgram,
	nativeDiagnostics: readonly ts.Diagnostic[],
	provider: CompilerDiagnosticProvider | undefined,
	cancellationToken?: ts.CancellationToken
): readonly ts.Diagnostic[] {
	if (!provider) {
		return nativeDiagnostics
	}

	let replacements: Map<string, readonly ts.Diagnostic[]> = new Map()

	for (let sourceFile of program.getSourceFiles()) {
		let diagnostics = provider.getSemanticDiagnostics(sourceFile, cancellationToken)
		if (diagnostics !== null) {
			replacements.set(sourceFile.fileName, diagnostics)
		}
	}

	return nativeDiagnostics
		.filter(diagnostic => !diagnostic.file || !replacements.has(diagnostic.file.fileName))
		.concat(...replacements.values())
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

	/** Apply transformer additions and deletions to diagnostics through public APIs. */
	modifyDiagnostics(program: ts.BuilderProgram, diagnostics: readonly ts.Diagnostic[]): ts.Diagnostic[] {
		let sourceFileNames = new Set(program.getSourceFiles().map(file => file.fileName))
		let modified: ts.Diagnostic[] = []

		for (let diag of diagnostics) {
			if (!this.hasDeleted(diag)) {
				modified.push(diag)
			}
		}

		for (let [fileName, added] of this.added) {
			if (sourceFileNames.has(fileName)) {
				modified.push(...added)
			}
		}

		return deduplicateDiagnostics(modified)
	}

	/** Before visit a source file, clean all the modification of it. */
	beforeVisitSourceFile(file: ts.SourceFile) {
		this.added.delete(file.fileName)
		this.deleted.delete(file.fileName)
	}
}


/** Help function to remove duplicate diagnostics. */
function deduplicateDiagnostics(diagnostics: ts.Diagnostic[]): ts.Diagnostic[] {
	let seen: Set<string> = new Set()
	let deduplicated: ts.Diagnostic[] = []

	for (let diagnostic of diagnostics) {
		let key = [
			diagnostic.file?.fileName ?? '',
			diagnostic.start ?? -1,
			diagnostic.length ?? -1,
			diagnostic.category,
			diagnostic.code,
			ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
		].join(':')

		if (!seen.has(key)) {
			seen.add(key)
			deduplicated.push(diagnostic)
		}

	}

	return deduplicated
}
