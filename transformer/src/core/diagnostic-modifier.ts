import type TS from 'typescript'
import {definePreVisitCallback} from './visitor-callbacks'
import {diagnosticModifier, sourceFile, ts} from './global'
import {Helper} from './helper'


// Where to find diagnostic codes:
// https://github.com/microsoft/TypeScript/blob/v5.6.3/src/compiler/diagnosticMessages.json


export namespace SourceFileDiagnosticModifier {

	const DiagnosticByStartPosition: Map<number, TS.Diagnostic> = new Map()
	const AddedStartIndices: Set<number> = new Set()
	const RemovedStartIndices: Set<number> = new Set()


	/** Initialize before visit a new source file. */
	export function initialize() {
		DiagnosticByStartPosition.clear()
		AddedStartIndices.clear()
		RemovedStartIndices.clear()
		diagnosticModifier.beforeVisitSourceFile(sourceFile)

		let diags = diagnosticModifier.getOfFile(sourceFile)
		if (!diags) {
			return
		}

		for (let diag of diags) {
			if (diag.start !== undefined) {
				DiagnosticByStartPosition.set(diag.start, diag)
			}
		}
	}

	/** Add a never read diagnostic. */
	export function addNeverRead(node: TS.Node, message: string) {
		add(node.getStart(), node.getText().length, 6133, message)
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
		if (AddedStartIndices.has(start)) {
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

		diagnosticModifier.add(diag)
		AddedStartIndices.add(start)
	}


	/** Add usage of a import specifier node, remove it's diagnostic. */
	export function removeNeverRead(node: TS.Node) {

		// If all imported members are not read,
		// diagnostic located at import declaration.
		if (ts.isImportSpecifier(node)) {
			let importDecl = node.parent.parent.parent

			if (ts.isImportDeclaration(importDecl)) {
				let start = importDecl.getStart()
				let diag = DiagnosticByStartPosition.get(start)

				if (diag && diag.code === 6133) {
					remove(importDecl, [6133])

					// Note not return here, all imports, and specified
					// import diagnostics exist at the same time.
				}
			}
		}

		// Diagnostic normally locate at declaration identifier.
		node = Helper.getIdentifier(node) ?? node

		remove(node, [6133, 6196])
	}

	/** For binding multiple parameters `:bind=${a, b}`. */
	export function removeUnusedComma(node: TS.Expression) {
		remove(node, [2695])
	}

	/** Remove diagnostic at specified node and code in limited codes. */
	function remove(node: TS.Node, codes: number[]) {
		let start = node.getStart()

		if (RemovedStartIndices.has(start)) {
			return
		}

		let diag = DiagnosticByStartPosition.get(start)

		if (diag && diag.start === start && codes.includes(diag.code)) {
			diagnosticModifier.delete(diag)
			RemovedStartIndices.add(start)
		}
	}
}


definePreVisitCallback(SourceFileDiagnosticModifier.initialize)
