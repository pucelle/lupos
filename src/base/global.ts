import {TransformerExtras} from 'ts-patch'
import type TS from 'typescript'
import {Modifier} from './modifier'
import {Interpolator} from './interpolator'
import {Visiting} from './visiting'
import {Imports} from './imports'
import {Scoping} from './scoping'


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
	Visiting.init()
	Scoping.init()
	Interpolator.init()
	Modifier.init()
	Imports.init()
}
