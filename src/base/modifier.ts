import {ListMap} from '../utils'
import type TS from 'typescript'
import {factory, sourceFile, ts} from './global'
import {Helper} from './helper'
import {InterpolationContentType, Interpolator} from './interpolator'
import {Visiting} from './visiting'
import {Scoping} from './scoping'


/** 
 * Help to do all dirty and detailed work for `interpolator`,
 * And provides detailed modifications compare with interpolator.
 */
export namespace Modifier {
	
	/** All imports. */
	const imports: ListMap<string, string> = new ListMap()

	/** The visiting indices the node at where will be moved. */
	const movedIndices: Set<number> = new Set()


	export function init() {
		imports.clear()
		movedIndices.clear()
	}


	/** Move node to another position, for each from index, only move for once. */
	export function moveOnce(fromIndex: number, toIndex: number) {
		if (movedIndices.has(fromIndex)) {
			return
		}

		Interpolator.move(fromIndex, toIndex)
		movedIndices.add(fromIndex)
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
		imports.addIf(moduleName, memberName)
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

	/** Add variables to target index as declaration statements or variable items. */
	export function addVariables(toIndex: number, names: string[]) {
		let rawNode = Visiting.getNode(toIndex)
		let exps: TS.VariableDeclarationList | TS.VariableDeclaration[]

		// `for (let i = 0; ...) ...`
		if (ts.isVariableDeclaration(rawNode)) {
			exps = names.map(name => 
				factory.createVariableDeclaration(
					factory.createIdentifier(name),
					undefined,
					undefined,
					undefined
				)
			)
		}
		else {
			exps = factory.createVariableDeclarationList(
				names.map(name => 
					factory.createVariableDeclaration(
						factory.createIdentifier(name),
						undefined,
						undefined,
						undefined
					)
				),
				ts.NodeFlags.None
			)
		}

		Interpolator.before(toIndex, InterpolationContentType.VariableDeclaration, () => exps)
	}


	/** Apply imports to do interpolation. */
	export function apply() {

		// Ensure all variables outputted.
		Scoping.applyVariablesAdding()

		// A ts bug here: if insert some named import identifiers,
		// and update the import statement,
		// will cause some not used type imports still there.
		// Current process step is: leave them there and wait for package step to eliminate.

		for (let [moduleName, names] of imports.entries()) {
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

				let beforeNode = sourceFile.statements.find(st => !ts.isImportDeclaration(st))!
				let toIndex = Visiting.getIndex(beforeNode)
				Interpolator.before(toIndex, InterpolationContentType.Normal, () => importDecl!)
			}
		}
	}
}