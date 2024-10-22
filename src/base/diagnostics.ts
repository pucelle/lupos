import type TS from 'typescript'
import {definePreVisitCallback} from './visitor-callbacks'
import {extras, sourceFile, ts} from './global'


// Where to find diagnostic codes:
// https://github.com/microsoft/TypeScript/blob/v5.6.3/src/compiler/diagnosticMessages.json


export namespace DiagnosticModifier {

	const ErrorNames: Set<number> = new Set()
	const RemovedIndices: Set<number> = new Set()


	/** Initialize before visit a new source file. */
	export function initialize() {
		ErrorNames.clear()
	}


	/** Add a missing import diagnostic. */
	export function addMissingImport(start: number, length: number, message: string) {
		add(start, length, 2304, message)
	}

	/** Add a normal diagnostic. */
	export function addNormal(start: number, length: number, message: string) {
		add(start, length, 0, message)
	}


	/** Add a missing import diagnostic. */
	function add(start: number, length: number, code: number, message: string) {
		if (ErrorNames.has(start)) {
			return
		}

		let diag: TS.Diagnostic = {
			category: ts.DiagnosticCategory.Error,
			code,
			messageText: message,
			file: sourceFile,
			start,
			length,
		}

		extras.addDiagnostic(diag)
		ErrorNames.add(start)
	}


	/** Add usage of a import specifier node, remove it's diagnostic. */
	export function removeNeverRead(node: TS.ImportSpecifier) {
		remove(node, 6133)
	}

	/** For binding multiple parameters `:bind=${a, b}`. */
	export function removeUnusedComma(node: TS.Expression) {
		remove(node, 2695)
	}


	function remove(node: TS.Node, code: number) {
		let startIndex = node.getStart()

		if (RemovedIndices.has(startIndex)) {
			return
		}

		for (let i = 0; i < extras.diagnostics.length; i++) {
			let diag = extras.diagnostics[i]
			if (diag.start === startIndex && diag.code === code) {
				extras.removeDiagnostic(i)
				RemovedIndices.add(startIndex)
				break
			}
		}
	}
}


definePreVisitCallback(DiagnosticModifier.initialize)