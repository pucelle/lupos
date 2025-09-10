import * as ts from 'typescript'
import {CompilerDiagnosticModifier, TransformerExtras} from '../../../compiler/out/patch'
import {helperOfContext, TemplateSlotPlaceholder} from '../lupos-ts-module'


export let program: ts.Program
export let compileToESM: boolean
export let typeChecker: ts.TypeChecker
export let compilerDiagnosticModifier: CompilerDiagnosticModifier
export let factory: ts.NodeFactory
export let transformContext: ts.TransformationContext
export let sourceFile: ts.SourceFile
export let helper: ReturnType<typeof helperOfContext>


export function setTransformContext(ctx: ts.TransformationContext, extras: TransformerExtras) {
	transformContext = ctx
	factory = ctx.factory
	compileToESM = extras.compileToESM
	program = extras.program.getProgram()
	typeChecker = program.getTypeChecker()
	compilerDiagnosticModifier = extras.compilerDiagnosticModifier
	helper = helperOfContext(ts, () => typeChecker)
	TemplateSlotPlaceholder.initialize(ts)
}


export function setSourceFile(file: ts.SourceFile) {
	sourceFile = file
}
