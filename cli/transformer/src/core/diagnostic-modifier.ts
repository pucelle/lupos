import {definePostVisitCallback, definePreVisitCallback} from './visitor-callbacks'
import {transformSession, transformContext} from './global'
import {DiagnosticModifier} from '../lupos-ts-module'
import {createTransformSessionStateKey} from './transform-session'


// Diagnostic codes:
// https://github.com/microsoft/TypeScript/blob/v5.6.3/src/compiler/diagnosticMessages.json


export class ExtendedDiagnosticModifier extends DiagnosticModifier {

	constructor() {
		super(transformContext.helper)
	}

	/** Output added and removed. */
	output() {
		let fileName = transformSession.sourceFile.fileName
		transformContext.compilerDiagnosticModifier.add(fileName, this.added)
		transformContext.compilerDiagnosticModifier.delete(fileName, this.deleted)
	}
}


const StateKey = createTransformSessionStateKey<ExtendedDiagnosticModifier>('DiagnosticModifier')

export function getSourceFileDiagnosticModifier(): ExtendedDiagnosticModifier {
	return transformSession.getState(StateKey, () => {
		let modifier = new ExtendedDiagnosticModifier()
		modifier.setSourceFile(transformSession.sourceFile)
		return modifier
	})
}

definePreVisitCallback(() => {
	let sourceFile = transformSession.sourceFile
	transformContext.compilerDiagnosticModifier.beforeVisitSourceFile(sourceFile)
	getSourceFileDiagnosticModifier()
})

definePostVisitCallback(() => {
	getSourceFileDiagnosticModifier().output()
})
