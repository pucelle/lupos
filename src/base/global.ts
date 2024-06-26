import {TransformerExtras} from 'ts-patch'
import type TS from 'typescript'
import {SourceFileModifier} from './source-file-modifier'


export let typeChecker: TS.TypeChecker
export let ts: typeof TS
export let transformContext: TS.TransformationContext
export let modifier: SourceFileModifier


export function setGlobal(program: TS.Program, extras: TransformerExtras) {
	typeChecker = program.getTypeChecker()
	ts = extras.ts
}


export function setTransform(ctx: TS.TransformationContext) {
	transformContext = ctx
}


export function setSourceFile(_file: TS.SourceFile) {
	modifier = new SourceFileModifier()
}
