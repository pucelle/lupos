import * as ts from 'typescript'
import {ListMap} from '../lupos-ts-module'
import {factory, sourceFile, helper} from './global'
import {InterpolationContentType, Interpolator} from './interpolator'
import {definePostVisitCallback, definePreVisitCallback} from './visitor-callbacks'
import {VariableScopeTree} from './scope-tree'
import {Packer} from './packer'


/** 
 * Help to do all dirty and detailed work for `interpolator`,
 * And provides detailed modifications compare with interpolator.
 */
export namespace Modifier {
	
	/** All imports. */
	const Imports: ListMap<string, string> = new ListMap()

	/** The nodes that will be moved. */
	const RemovedNodes: Set<ts.Node> = new Set()

	/** The nodes that have been persisted. */
	const PersistedImportNodes: Set<ts.Node> = new Set()


	/** Initialize before visiting a new source file. */
	export function initialize() {
		Imports.clear()
		RemovedNodes.clear()
		PersistedImportNodes.clear()
	}


	/** Remove import node of specified node. */
	export function removeImportOf(fromNode: ts.Node) {
		let importNode = helper.symbol.resolveDeclaration(fromNode, ts.isImportSpecifier, false)
		if (importNode) {
			removeOnce(importNode)
		}
	}


	/** Remove node, only remove for once. */
	export function removeOnce(fromNode: ts.Node) {
		if (RemovedNodes.has(fromNode)) {
			return
		}

		Interpolator.remove(fromNode)
		RemovedNodes.add(fromNode)
	}


	/** Move node to another position, for each from index, only move for once. */
	export function moveOnce(fromNode: ts.Node, toNode: ts.Node) {
		if (RemovedNodes.has(fromNode)) {
			return
		}

		Interpolator.move(fromNode, toNode)
		RemovedNodes.add(fromNode)
	}


	/** Add or replace a member to a class declaration. */
	export function addClassMember(classNode: ts.ClassDeclaration, member: ts.ClassElement, preferInsertToHead: boolean = false) {
		let name = helper.class.getMemberName(member)
		let existing = classNode.members.find(m => helper.class.getMemberName(m) === name)

		if (existing) {
			Interpolator.replace(existing, InterpolationContentType.Normal, () => member)
		}
		else if (preferInsertToHead) {
			Interpolator.prepend(classNode, InterpolationContentType.Normal, () => member)
		}
		else {
			Interpolator.append(classNode, InterpolationContentType.Normal, () => member)
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
	 * An import may be removed by typescript compiling because of no use.
	 * Use this can persist it.
	 */
	export function persistImport(node: ts.ImportSpecifier) {
		if (PersistedImportNodes.has(node)) {
			return
		}

		PersistedImportNodes.add(node)
		
		Interpolator.replace(node, InterpolationContentType.Import, () => {
			return factory.createImportSpecifier(node.isTypeOnly, node.propertyName, node.name)
		})
	}

	
	/** 
	 * Insert a variable assignment from a position to an existing variable list.
	 * `a.b()` -> `let ..., $ref_ = a.b()`, and move it.
	 */
	export function addVariableAssignmentToList(fromNode: ts.Node, toNode: ts.Node, varName: string) {
		Interpolator.before(toNode, InterpolationContentType.Declaration, () => {
			let node = Interpolator.outputChildren(fromNode) as ts.Expression
			node = Packer.normalize(node, false) as ts.Expression
			
			return factory.createVariableDeclaration(
				factory.createIdentifier(varName),
				undefined,
				undefined,
				node
			)
		})
	}

	/** 
	 * Insert a variable assignment from a position to an existing variable list.
	 * `a.b()` -> let $ref_ = a.b()`, and move it.
	 */
	export function addVariableAssignment(fromNode: ts.Node, toNode: ts.Node, varName: string) {
		Interpolator.before(toNode, InterpolationContentType.Declaration, () => {
			let node = Interpolator.outputChildren(fromNode) as ts.Expression
			node = Packer.normalize(node, false) as ts.Expression
			
			return factory.createVariableDeclarationList(
				[factory.createVariableDeclaration(
					factory.createIdentifier(varName),
					undefined,
					undefined,
					node
				)],
				ts.NodeFlags.Let
			)
		})
	}

	/** 
	 * Insert a reference expression from a position to another position.
	 * `a.b()` -> `$ref_ = a.b()`, and move it.
	 */
	export function addReferenceAssignment(fromNode: ts.Node, toNode: ts.Node, refName: string) {
		Interpolator.before(toNode, InterpolationContentType.Reference, () => {
			let node = Interpolator.outputChildren(fromNode) as ts.Expression
			node = Packer.normalize(node, false) as ts.Expression

			return factory.createBinaryExpression(
				factory.createIdentifier(refName),
				factory.createToken(ts.SyntaxKind.EqualsToken),
				node
			)
		})
	}



	/** Apply imports to do interpolation. */
	export function applyInterpolation() {
		let beforeNode = VariableScopeTree.getTopmost().getTargetNodeToAddStatements()
		let modifiedImportDecls: Set<ts.ImportDeclaration> = new Set()


		// A ts bug here: if insert some named import identifiers,
		// and update the import statement,
		// will cause some not used type imports still there.
		// Current process step is: leave them there and wait for package step to eliminate.

		for (let [moduleName, names] of Imports.entries()) {
			let existingImportDecl = getNamedImportDeclaration(moduleName)
			let existingNames: Map<string, ts.ImportSpecifier> = new Map()

			// Removes existing names.
			if (existingImportDecl) {
				for (let element of (existingImportDecl.importClause!.namedBindings as ts.NamedImports).elements) {
					existingNames.set(element.name.text, element)
				}
			}

			// Filter out existing names, and also avoid these imports to be deleted.
			if (existingNames.size > 0) {
				for (let name of names) {
					if (existingNames.has(name)) {
						persistImport(existingNames.get(name)!)
					}
				}

				names = names.filter(name => !existingNames.has(name))
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
				let existingNamedImports = existingImportDecl.importClause!.namedBindings!
				Interpolator.append(existingNamedImports, InterpolationContentType.Import, () => namedImports)
				modifiedImportDecls.add(existingImportDecl)
			}

			// Add a new import statement.
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

				Interpolator.before(beforeNode, InterpolationContentType.Import, () => newImportDecl!)
			}
		}

		for (let specifier of PersistedImportNodes) {
			let importDecl = specifier.parent.parent.parent

			if (ts.isImportDeclaration(importDecl)) {
				modifiedImportDecls.add(importDecl)
			}
		}

		// Because modified whole import node, cause type imports still exist.
		// Here remove them manually.
		for (let importDecl of modifiedImportDecls) {
			removeTypedImports(importDecl)
		}
	}

	/** Get `import {...}` node by module name. */
	function getNamedImportDeclaration(moduleName: string): ts.ImportDeclaration | undefined {
		let importDecl = helper.imports.getImportFromModule(moduleName, sourceFile)
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
	function removeTypedImports(node: ts.ImportDeclaration) {
		let namedBindings = node.importClause?.namedBindings
		if (!namedBindings || !ts.isNamedImports(namedBindings)) {
			return 
		}

		for (let specifier of namedBindings.elements) {
			let type = helper.symbol.resolveDeclaration(specifier, helper.isTypeDeclaration)
			if (type) {
				removeOnce(specifier)
			}
		}
	}
}

definePreVisitCallback(Modifier.initialize)
definePostVisitCallback(Modifier.applyInterpolation)
