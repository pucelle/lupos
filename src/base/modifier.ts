import {ListMap} from '../utils'
import type TS from 'typescript'
import {factory, ts} from './global'
import {Helper} from './helper'
import {InterpolationContentType, Interpolator} from './interpolator'
import {VisitTree} from './visite-tree'
import {definePostVisitCallback, definePreVisitCallback} from './visitor-callbacks'
import {ScopeTree} from './scope-tree'


/** 
 * Help to do all dirty and detailed work for `interpolator`,
 * And provides detailed modifications compare with interpolator.
 */
export namespace Modifier {
	
	/** All imports. */
	const Imports: ListMap<string, string> = new ListMap()

	/** The visiting indices the node at where will be moved. */
	const RemovedIndices: Set<number> = new Set()


	export function initialize() {
		Imports.clear()
		RemovedIndices.clear()
	}


	/** Remove import node of specified node. */
	export function removeImportOf(fromNode: TS.Node) {
		let importNode = Helper.symbol.resolveDeclaration(fromNode, ts.isImportSpecifier, false)
		if (importNode) {
			let index = VisitTree.getIndex(importNode)
			removeOnce(index)
		}
	}


	/** Remove node, only remove for once. */
	export function removeOnce(fromIndex: number) {
		if (RemovedIndices.has(fromIndex)) {
			return
		}

		Interpolator.remove(fromIndex)
		RemovedIndices.add(fromIndex)
	}


	/** Move node to another position, for each from index, only move for once. */
	export function moveOnce(fromIndex: number, toIndex: number) {
		if (RemovedIndices.has(fromIndex)) {
			return
		}

		Interpolator.move(fromIndex, toIndex)
		RemovedIndices.add(fromIndex)
	}


	/** Add a member to a class declaration. */
	export function addClassMember(classIndex: number, member: TS.ClassElement, preferInsertToHead: boolean = false) {
		let node = VisitTree.getNode(classIndex) as TS.ClassDeclaration
		let name = Helper.cls.getMemberName(member)
		let existing = node.members.find(m => Helper.cls.getMemberName(m) === name)

		if (existing) {
			let toIndex = VisitTree.getIndex(existing)
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
		Interpolator.before(toIndex, InterpolationContentType.Declaration, () => {
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



	/** Apply imports to do interpolation. */
	export function applyInterpolation() {
		let sourceFileIndex = ScopeTree.getTopmost().getIndexToAddStatements()


		// A ts bug here: if insert some named import identifiers,
		// and update the import statement,
		// will cause some not used type imports still there.
		// Current process step is: leave them there and wait for package step to eliminate.

		for (let [moduleName, names] of Imports.entries()) {
			let existingImportDecl = getNamedImportDeclaration(moduleName)

			// Removes existing names.
			if (existingImportDecl) {
				let existingNames = (existingImportDecl.importClause!.namedBindings as TS.NamedImports).elements.map(e => e.name.text)
				names = names.filter(name => !existingNames.includes(name))
			}

			if (names.length === 0) {
				continue
			}

			let namedImports = names.map(name => factory.createImportSpecifier(
				false,
				undefined,
				factory.createIdentifier(name)
			))

			// Add more imports.
			if (existingImportDecl) {
				let namedImportsIndex = VisitTree.getIndex(existingImportDecl.importClause!.namedBindings!)
				Interpolator.append(namedImportsIndex, InterpolationContentType.Import, () => namedImports)
				
				// Because modified whole import node, cause type imports still exist.
				// Here remove them manually.
				removeAllTypedImports(existingImportDecl)
			}

			// Add an import statement.
			else {
				let newImportDecl = factory.createImportDeclaration(
					undefined,
					factory.createImportClause(
						false,
						undefined,
						factory.createNamedImports(namedImports)
					),
					factory.createStringLiteral(moduleName),
					undefined
				)

				Interpolator.before(sourceFileIndex, InterpolationContentType.Import, () => newImportDecl!)
			}
		}
	}

	/** Get `import {...}` node by module name. */
	function getNamedImportDeclaration(moduleName: string): TS.ImportDeclaration | undefined {
		let importDecl = Helper.imports.getImportFromModule(moduleName)
		if (!importDecl) {
			return undefined
		}

		if (!importDecl.importClause) {
			return undefined
		}

		if (!importDecl.importClause.namedBindings) {
			return undefined
		}

		if (!ts.isNamedImports(importDecl.importClause.namedBindings)) {
			return undefined
		}

		return importDecl
	}

	/** Remove all type imports. */
	function removeAllTypedImports(node: TS.ImportDeclaration) {
		let specifiers = (node.importClause!.namedBindings as TS.NamedImports).elements

		for (let specifier of specifiers) {
			let type = Helper.symbol.resolveDeclaration(specifier, ts.isTypeAliasDeclaration)
			if (type) {
				removeOnce(VisitTree.getIndex(specifier))
			}
		}
	}
}

definePreVisitCallback(Modifier.initialize)
definePostVisitCallback(Modifier.applyInterpolation)
