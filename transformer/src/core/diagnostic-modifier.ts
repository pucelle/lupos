import {definePostVisitCallback, definePreVisitCallback} from './visitor-callbacks'
import {diagnosticModifier, sourceFile, helper} from './global'
import {DiagnosticModifier} from '../lupos-ts-module'


// Where to find diagnostic codes:
// https://github.com/microsoft/TypeScript/blob/v5.6.3/src/compiler/diagnosticMessages.json


export class SourceFileDiagnosticModifierClass extends DiagnosticModifier {

	constructor() {
		let diags = diagnosticModifier.getOfFile(sourceFile) || []
		super(diags, sourceFile, helper)
	}

	/** Output added and removed. */
	output() {
		for (let diag of this.added) {
			diagnosticModifier.add(diag)
		}

		for (let diag of this.deleted) {
			diagnosticModifier.delete(diag)
		}
	}
}


export let SourceFileDiagnosticModifier: SourceFileDiagnosticModifierClass

definePreVisitCallback(() => {
	SourceFileDiagnosticModifier = new SourceFileDiagnosticModifierClass()
})

definePostVisitCallback(() => {
	SourceFileDiagnosticModifier.output()
})
