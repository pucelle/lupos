import {TransformerExtras} from 'ts-patch'
import type TS from 'typescript'
import {modifier} from './modifier'
import {interpolator} from './interpolator'
import {visiting} from './visiting'
import {imports} from './imports'


export let typeChecker: TS.TypeChecker
export let ts: typeof TS
export let printer: TS.Printer
export let factory: TS.NodeFactory
export let transformContext: TS.TransformationContext
export let sourceFile: TS.SourceFile


export function setGlobal(program: TS.Program, extras: TransformerExtras) {
	typeChecker = program.getTypeChecker()
	ts = extras.ts
	factory = ts.factory
	printer = ts.createPrinter()
}


export function setTransformContext(ctx: TS.TransformationContext) {
	transformContext = ctx
}


export function setSourceFile(file: TS.SourceFile) {
	sourceFile = file
	visiting.initialize()
	interpolator.initialize()
	modifier.initialize()
	imports.initialize()
}
