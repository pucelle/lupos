import ts from 'typescript'
import {CompilerDiagnosticModifier, TransformerExtras} from '../../../compiler/out/patch'
import {helperOfContext, TemplateSlotPlaceholder, setFingerPrintSalt} from '../lupos-ts-module'
import {TransformSession} from './transform-session'
import {createTemplateTypeQuery} from '../mirror-provider/template-type-query'


/** Mutable state shared by every source file in one transformer invocation. */
export class TransformContext {

	readonly program: ts.Program
	readonly compileToESM: boolean
	readonly embedSVG: boolean
	readonly compilerDiagnosticModifier: CompilerDiagnosticModifier
	readonly factory: ts.NodeFactory
	readonly transformationContext: ts.TransformationContext
	readonly helper: ReturnType<typeof helperOfContext>

	constructor(context: ts.TransformationContext, extras: TransformerExtras) {
		this.transformationContext = context
		this.factory = context.factory
		this.compileToESM = extras.compileToESM
		this.embedSVG = extras.embedSVG
		this.program = extras.program.getProgram()
		this.compilerDiagnosticModifier = extras.compilerDiagnosticModifier

		this.helper = helperOfContext(ts, this.program)
		this.helper.types.setTemplateTypeQuery(createTemplateTypeQuery(this.program))
	}
}


export let transformContext: TransformContext
export let transformSession: TransformSession


/** After enter the transformer. */
export function setTransformContext(context: ts.TransformationContext, extras: TransformerExtras) {
	transformContext = new TransformContext(context, extras)
	TemplateSlotPlaceholder.initialize(ts)
}


/** After entering each source file. */
export function createTransformSession(file: ts.SourceFile): TransformSession {
	transformSession = new TransformSession(file)
	setFingerPrintSalt(file.fileName)

	return transformSession
}
