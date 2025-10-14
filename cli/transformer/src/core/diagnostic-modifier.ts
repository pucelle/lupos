import {definePostVisitCallback, definePreVisitCallback} from './visitor-callbacks'
import {compilerDiagnosticModifier, sourceFile, helper, builderProgram} from './global'
import {DiagnosticModifier} from '../lupos-ts-module'


// Diagnostic codes:
// https://github.com/microsoft/TypeScript/blob/v5.6.3/src/compiler/diagnosticMessages.json


export class ExtendedDiagnosticModifier extends DiagnosticModifier {

	constructor() {
		super(helper)
	}

	/** Output added and removed. */
	output() {
		compilerDiagnosticModifier.add(sourceFile.fileName, this.added, builderProgram)
		compilerDiagnosticModifier.delete(sourceFile.fileName, this.deleted, builderProgram)
		compilerDiagnosticModifier.setPotentialAllImportsUnUsed(sourceFile.fileName, this.potentialAllImportsUnUsed)
	}
}


export let SourceFileDiagnosticModifier: ExtendedDiagnosticModifier

definePreVisitCallback(() => {
	compilerDiagnosticModifier.beforeVisitSourceFile(sourceFile)
	SourceFileDiagnosticModifier = new ExtendedDiagnosticModifier()
	SourceFileDiagnosticModifier.setSourceFile(sourceFile)
})

definePostVisitCallback(() => {
	SourceFileDiagnosticModifier.output()
})
