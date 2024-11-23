import TS from 'typescript'
import {DiagnosticModifier, TransformerExtras} from '../../../compiler/out/patch'


export let typeChecker: TS.TypeChecker
export let diagnosticModifier: DiagnosticModifier
export let ts = TS	// May switch to a patched typescript like `ts-patch`.
export let factory: TS.NodeFactory
export let transformContext: TS.TransformationContext
export let sourceFile: TS.SourceFile


export function setTransformProgram(extras: TransformerExtras) {
	typeChecker = extras.program.getProgram().getTypeChecker()
	diagnosticModifier = extras.diagnosticModifier
}


export function setTransformContext(ctx: TS.TransformationContext) {
	transformContext = ctx
	factory = ctx.factory
}


export function setSourceFile(file: TS.SourceFile) {
	sourceFile = file
}
