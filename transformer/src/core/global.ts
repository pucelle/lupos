import * as ts from 'typescript'
import {DiagnosticModifier, TransformerExtras} from '../../../compiler/out/patch'
import {Helper} from '../lupos-ts-module'


export let typeChecker: ts.TypeChecker
export let diagnosticModifier: DiagnosticModifier
export let factory: ts.NodeFactory
export let transformContext: ts.TransformationContext
export let sourceFile: ts.SourceFile


export function setTransformContext(ctx: ts.TransformationContext, extras: TransformerExtras) {
	transformContext = ctx
	factory = ctx.factory
	typeChecker = extras.program.getProgram().getTypeChecker()
	diagnosticModifier = extras.diagnosticModifier

	Helper.setContext(typeChecker, ctx)
}


export function setSourceFile(file: ts.SourceFile) {
	sourceFile = file
}
