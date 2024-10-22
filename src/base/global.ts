import {TransformerExtras} from 'ts-patch'
import type TS from 'typescript'


export let typeChecker: TS.TypeChecker
export let ts: typeof TS
export let printer: TS.Printer
export let factory: TS.NodeFactory
export let transformContext: TS.TransformationContext
export let sourceFile: TS.SourceFile
export let extras: TransformerExtras


export function setGlobal(program: TS.Program, extrasParam: TransformerExtras) {
	typeChecker = program.getTypeChecker()
	extras = extrasParam
	ts = extrasParam.ts
	factory = ts.factory
	printer = ts.createPrinter()
}


export function setTransformContext(ctx: TS.TransformationContext) {
	transformContext = ctx
}


export function setSourceFile(file: TS.SourceFile) {
	sourceFile = file
}
