import {ListMap} from '../utils'
import type TS from 'typescript'
import {factory, sourceFile, ts} from './global'
import {Helper} from './helper'
import {InterpolationContentType, Interpolator} from './interpolator'
import {Visiting} from './visiting'


/** 
 * Help to do all dirty and detailed work for `interpolator`,
 * And provides detailed modifications compare with interpolator.
 */
export namespace Modifier {
	
	/** All imports. */
	const Imports: ListMap<string, string> = new ListMap()

	/** The visiting indices the node at where will be moved. */
	const MovedIndices: Set<number> = new Set()

	/** Declarations will be inserted to source file, after import statements. */
	let topmostDeclarations: (TS.Expression | TS.Statement)[] = []


	export function init() {
		Imports.clear()
		MovedIndices.clear()
		topmostDeclarations = []
	}


	/** Move node to another position, for each from index, only move for once. */
	export function moveOnce(fromIndex: number, toIndex: number) {
		if (MovedIndices.has(fromIndex)) {
			return
		}

		Interpolator.move(fromIndex, toIndex)
		MovedIndices.add(fromIndex)
	}


	/** Add a member to a class declaration. */
	export function addClassMember(classIndex: number, member: TS.ClassElement, preferInsertToHead: boolean = false) {
		let node = Visiting.getNode(classIndex) as TS.ClassDeclaration
		let name = Helper.cls.getMemberName(member)
		let existing = node.members.find(m => Helper.cls.getMemberName(m) === name)

		if (existing) {
			let toIndex = Visiting.getIndex(existing)
			Interpolator.replace(toIndex, InterpolationContentType.Normal, () => member)
		}
		else if (preferInsertToHead) {
			Interpolator.prepend(classIndex, InterpolationContentType.Normal, () => member)
		}
		else {
			Interpolator.append(classIndex, InterpolationContentType.Normal, () => member)
		}
	}
	

	/** 
	 * Add a named import - `import {memberName} from moduleName`.
	 * Repetitive adding will be eliminated.
	 */
	export function addImport(memberName: string, moduleName: string) {
		Imports.addIf(moduleName, memberName)
	}

	
	/** 
	 * Insert a variable assignment from a position to an existing variable list.
	 * `a.b()` -> `var ..., $ref_ = a.b()`, and move it.
	 */
	export function addVariableAssignmentToList(fromIndex: number, toIndex: number, varName: string) {
		Interpolator.before(toIndex, InterpolationContentType.VariableDeclaration, () => {
			let node = Interpolator.outputChildren(fromIndex) as TS.Expression
			node = Helper.pack.normalize(node, false) as TS.Expression
			
			return factory.createVariableDeclaration(
				factory.createIdentifier(varName),
				undefined,
				undefined,
				node
			)
		})
	}

	/** 
	 * Insert a reference expression from a position to another position.
	 * `a.b()` -> `$ref_ = a.b()`, and move it.
	 */
	export function addReferenceAssignment(fromIndex: number, toIndex: number, refName: string) {
		Interpolator.before(toIndex, InterpolationContentType.Reference, () => {
			let node = Interpolator.outputChildren(fromIndex) as TS.Expression
			node = Helper.pack.normalize(node, false) as TS.Expression

			return factory.createBinaryExpression(
				factory.createIdentifier(refName),
				factory.createToken(ts.SyntaxKind.EqualsToken),
				node
			)
		})
	}


	/** Add some declarations to the head of source file, bug after import statements. */
	export function addTopmostDeclarations(...decls: (TS.Expression | TS.Statement)[]) {
		topmostDeclarations.push(...decls)
	}


	/** Apply imports to do interpolation. */
	export function apply() {
		let firstNonImportNode = sourceFile.statements.find(st => !ts.isImportDeclaration(st))!
		let sourceFileIndex = Visiting.getIndex(firstNonImportNode)


		// A ts bug here: if insert some named import identifiers,
		// and update the import statement,
		// will cause some not used type imports still there.
		// Current process step is: leave them there and wait for package step to eliminate.

		for (let [moduleName, names] of Imports.entries()) {
			let importDecl = Helper.imports.getImportFromModule(moduleName)

			let namedImports = names.map(name => factory.createImportSpecifier(
				false,
				undefined,
				factory.createIdentifier(name)
			))

			// Add more imports.
			if (importDecl) {
				let namedImportsIndex = Visiting.getIndex(importDecl.importClause!.namedBindings!)
				Interpolator.append(namedImportsIndex, InterpolationContentType.Normal, () => namedImports)
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

				Interpolator.before(sourceFileIndex, InterpolationContentType.Normal, () => importDecl!)
			}
		}

		// Insert declarations after import statements.
		if (topmostDeclarations.length > 0) {
			Interpolator.before(sourceFileIndex, InterpolationContentType.Normal, () => topmostDeclarations)
		}
	}
}