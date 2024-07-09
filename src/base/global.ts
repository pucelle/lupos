import {TransformerExtras} from 'ts-patch'
import type TS from 'typescript'
import {SourceFileModifier} from './source-file-modifier'


export let typeChecker: TS.TypeChecker
export let ts: typeof TS
export let printer: TS.Printer
export let factory: TS.NodeFactory
export let transformContext: TS.TransformationContext
export let sourceFile: TS.SourceFile
export let modifier: SourceFileModifier


export function setGlobal(program: TS.Program, extras: TransformerExtras) {
	typeChecker = program.getTypeChecker()
	ts = extras.ts
	factory = ts.factory
	printer = ts.createPrinter()
}


export function setTransform(ctx: TS.TransformationContext) {
	transformContext = ctx
}


export function setSourceFile(file: TS.SourceFile) {
	sourceFile = file
	modifier = new SourceFileModifier()
}
