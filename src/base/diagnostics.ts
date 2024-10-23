import type TS from 'typescript'
import {definePreVisitCallback} from './visitor-callbacks'
import {extras, sourceFile, ts} from './global'
import {Helper} from './helper'


// Where to find diagnostic codes:
// https://github.com/microsoft/TypeScript/blob/v5.6.3/src/compiler/diagnosticMessages.json


export namespace DiagnosticModifier {

	const DiagnosticMap: Map<number, TS.Diagnostic> = new Map()

	const ErrorNames: Set<number> = new Set()
	const RemovedIndices: Set<number> = new Set()


	/** Initialize before visit a new source file. */
	export function initialize() {
		for (let diag of extras.diagnostics) {
			if (diag.start !== undefined) {
				DiagnosticMap.set(diag.start, diag)
			}
		}
	}


	/** Initialize before visit a new source file. */
	export function preSourceFileInitialize() {
		ErrorNames.clear()
		RemovedIndices.clear()
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
	export function removeNeverRead(node: TS.Node) {
		// If all imported members are not read,
		// diagnostic located at import declaration.
		if (ts.isImportSpecifier(node)) {
			let importDecl = node.parent.parent.parent

			if (ts.isImportDeclaration(importDecl)) {
				let start = importDecl.getStart()
				let diag = DiagnosticMap.get(start)

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


	function remove(node: TS.Node, codes: number[]) {
		let start = node.getStart()

		if (RemovedIndices.has(start)) {
			return
		}

		for (let i = 0; i < extras.diagnostics.length; i++) {
			let diag = extras.diagnostics[i]
			if (diag.file !== sourceFile) {
				continue
			}

			if (diag.start === start && codes.includes(diag.code)) {
				extras.removeDiagnostic(i)
				RemovedIndices.add(start)
				break
			}
		}
	}
}


definePreVisitCallback(DiagnosticModifier.preSourceFileInitialize)
