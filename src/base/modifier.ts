import {ListMap} from '../utils'
import type TS from 'typescript'
import {factory, sourceFile, ts} from './global'
import {helper} from './helper'
import {interpolator} from './interpolator'
import {visiting} from './visiting'


/** Help to do all dirty and detailed work for `interpolator`. */
export namespace modifier {
	
	/** All imports. */
	const imports: ListMap<string, string> = new ListMap()

	/** The visiting indices the node at where will be moved. */
	const movedIndices: Set<number> = new Set()


	export function initialize() {
		imports.clear()
		movedIndices.clear()
	}


	/** Move node to another position, for each from index, only move for once. */
	export function moveOnce(fromIndex: number, toIndex: number) {
		if (movedIndices.has(fromIndex)) {
			return
		}

		interpolator.move(fromIndex, toIndex)
		movedIndices.add(fromIndex)
	}


	/** Add a member to a class declaration. */
	export function addClassMember(classIndex: number, member: TS.ClassElement, preferInsertToHead: boolean = false) {
		let node = visiting.getNode(classIndex) as TS.ClassDeclaration
		let name = helper.cls.getMemberName(member)
		let existing = node.members.find(m => helper.cls.getMemberName(m) === name)

		if (existing) {
			let toIndex = visiting.getIndex(existing)
			interpolator.addReplace(toIndex, () => member)
		}
		else if (preferInsertToHead) {
			let toIndex = visiting.getFirstChildIndex(classIndex)!
			interpolator.addBefore(toIndex, () => member)
		}
		else {
			let toIndex = visiting.getLastChildIndex(classIndex)!
			interpolator.addAfter(toIndex, () => member)
		}
	}
	

	/** 
	 * Add a named import - `import {memberName} from moduleName`.
	 * Repetitive adding will be eliminated.
	 */
	export function addImport(memberName: string, moduleName: string) {
		imports.addIf(moduleName, memberName)
	}

	/** Apply imports to do interpolation. */
	export function apply() {

		// A ts bug here: if insert some named import identifiers,
		// and update the import statement,
		// will cause some not used type imports still there.
		// Current process step is: leave them there and wait for package step to eliminate.
		
		for (let [moduleName, names] of imports.entries()) {
			let importDecl = helper.imports.getImportFromModule(moduleName)

			let namedImports = names.map(name => factory.createImportSpecifier(
				false,
				undefined,
				factory.createIdentifier(name)
			))

			// Add more imports.
			if (importDecl) {
				let namedImportsIndex = visiting.getIndex(importDecl.importClause!.namedBindings!)
				let toIndex = visiting.getLastChildIndex(namedImportsIndex)

				// Add names.
				if (toIndex !== undefined) {
					interpolator.addAfter(toIndex, () => namedImports)
				}

				// Replace whole `{}` to `{...}`.
				else {
					let clause = factory.createImportClause(
						false,
						undefined,
						factory.createNamedImports(namedImports)
					)

					interpolator.addReplace(namedImportsIndex, () => clause)
				}
			}

			// Add an import statement.
			else {
				importDecl = factory.createImportDeclaration(
					undefined,
					factory.createImportClause(
						false,
						undefined,
						factory.createNamedImports(namedImports)
					),
					factory.createStringLiteral(moduleName),
					undefined
				)

				let beforeNode = sourceFile.statements.find(st => !ts.isImportDeclaration(st))!
				let toIndex = visiting.getIndex(beforeNode)
				interpolator.addBefore(toIndex, () => importDecl!)
			}
		}
	}
}