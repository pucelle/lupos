import ts from 'typescript'
import {ListMap} from '../lupos-ts-module'
import {transformSession, transformContext} from './global'
import {InterpolationContentType, Interpolator} from './interpolator'
import {definePostVisitCallback} from './visitor-callbacks'
import {DeclarationScopeTree} from './scope-tree'
import {Packer} from './packer'
import {createTransformSessionStateKey} from './transform-session'


interface ModifierState {
	imports: ListMap<string, string>
	removedNodes: Set<ts.Node>
	persistedImportNodes: Set<ts.Node>
}


/** 
 * Help to do all dirty and detailed work for `interpolator`,
 * And provides detailed modifications compare with interpolator.
 */
export namespace Modifier {

	const StateKey = createTransformSessionStateKey<ModifierState>('Modifier')

	function getState(): ModifierState {
		return transformSession.getState(StateKey, () => ({
			imports: new ListMap(),
			removedNodes: new Set(),
			persistedImportNodes: new Set(),
		}))
	}


	/** Remove import node of specified node. */
	export function removeImportOf(fromNode: ts.Node) {
		let importNode = transformContext.helper.symbol.resolveDeclaration(fromNode, ts.isImportSpecifier, false)
		if (importNode) {
			removeOnce(importNode)
		}
	}


	/** Remove node, only remove for once. */
	export function removeOnce(fromNode: ts.Node) {
		let removedNodes = getState().removedNodes
		if (removedNodes.has(fromNode)) {
			return
		}

		Interpolator.remove(fromNode)
		removedNodes.add(fromNode)
	}


	/** Move node to another position, for each from index, only move for once. */
	export function moveOnce(fromNode: ts.Node, toNode: ts.Node) {
		let removedNodes = getState().removedNodes
		if (removedNodes.has(fromNode)) {
			return
		}

		Interpolator.move(fromNode, toNode)
		removedNodes.add(fromNode)
	}


	/** Add or replace a member to a class declaration. */
	export function addClassMember(classNode: ts.ClassDeclaration, member: ts.ClassElement, preferInsertToHead: boolean = false) {
		let name = transformContext.helper.objectLike.getMemberName(member)
		let existing = classNode.members.find(m => transformContext.helper.objectLike.getMemberName(m) === name)

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
		getState().imports.addIf(moduleName, memberName)
	}


	/** 
	 * An import may be removed by typescript compiling because of no use.
	 * Use this can persist it.
	 */
	export function persistImport(node: ts.ImportSpecifier) {
		let persistedImportNodes = getState().persistedImportNodes
		if (persistedImportNodes.has(node)) {
			return
		}

		persistedImportNodes.add(node)
		
		// Here has a bug if we simply replace:
		// If a module output a class and an interface with same name.
		// only replace it can't prevent it from been removed in compiling step.

		Interpolator.after(node, InterpolationContentType.Import, () => {
			return transformContext.factory.createImportSpecifier(false, node.propertyName, node.name)
		})

		Interpolator.remove(node)
	}

	
	/** 
	 * Insert a variable assignment from a position to an existing variable list.
	 * `a.b()` -> `let ..., $ref_ = a.b()`, and move it.
	 */
	export function addVariableAssignmentToList(fromNode: ts.Node, toNode: ts.Node, varName: string) {
		Interpolator.before(toNode, InterpolationContentType.Declaration, () => {
			let node = Interpolator.outputChildren(fromNode) as ts.Expression
			node = Packer.normalize(node, false) as ts.Expression
			
			return transformContext.factory.createVariableDeclaration(
				transformContext.factory.createIdentifier(varName),
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
			
			return transformContext.factory.createVariableDeclarationList(
				[transformContext.factory.createVariableDeclaration(
					transformContext.factory.createIdentifier(varName),
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

			return transformContext.factory.createBinaryExpression(
				transformContext.factory.createIdentifier(refName),
				transformContext.factory.createToken(ts.SyntaxKind.EqualsToken),
				node
			)
		})
	}

	/** 
	 * Insert a reference expression from a position to another position.
	 * `a.b()` -> `$ref_ = a.b()`, and insert to before itself.
	 */
	export function replaceReferenceAssignment(fromNode: ts.Node, refName: string) {
		Interpolator.replace(fromNode, InterpolationContentType.Reference, () => {
			let node = Interpolator.outputChildren(fromNode) as ts.Expression
			node = Packer.normalize(node, false) as ts.Expression

			return transformContext.factory.createBinaryExpression(
				transformContext.factory.createIdentifier(refName),
				transformContext.factory.createToken(ts.SyntaxKind.EqualsToken),
				node
			)
		})
	}


	/** Apply imports to do interpolation. */
	export function applyInterpolation() {
		let beforeNode = DeclarationScopeTree.getTopmost().getTargetNodeToAddStatements()
		let modifiedImportDecls: Set<ts.ImportDeclaration> = new Set()


		// A ts bug here: if insert some named import identifiers,
		// and update the import statement,
		// will cause some not used type imports still there.
		// Current process step is: leave them there and wait for package step to eliminate.

		for (let [moduleName, names] of getState().imports.entries()) {
			let existingImportDecl = getNamedImportDeclaration(moduleName)
			let existingNames: Map<string, ts.ImportSpecifier> = new Map()

			// Removes existing names.
			if (existingImportDecl) {
				for (let element of (existingImportDecl.importClause!.namedBindings as ts.NamedImports).elements) {
					existingNames.set(element.name.text, element)

					// Removes const enum imports, which will cause error in bun.
					let resolved = transformContext.helper.symbol.resolveDeclaration(element.name)
					if (resolved
						&& ts.isEnumDeclaration(resolved)
						&& resolved.modifiers?.some(m => m.kind === ts.SyntaxKind.ConstKeyword)
					) {
						Interpolator.remove(element)
					}
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

			let namedImports = names.map(name => transformContext.factory.createImportSpecifier(
				false,
				undefined,
				transformContext.factory.createIdentifier(name)
			))

			// Add more imports.
			if (existingImportDecl) {
				let existingNamedImports = existingImportDecl.importClause!.namedBindings!
				Interpolator.append(existingNamedImports, InterpolationContentType.Import, () => namedImports)
				modifiedImportDecls.add(existingImportDecl)
			}

			// Add a new import statement.
			else {
				let newImportDecl = transformContext.factory.createImportDeclaration(
					undefined,
					transformContext.factory.createImportClause(
						undefined,
						undefined,
						transformContext.factory.createNamedImports(namedImports)
					),
					transformContext.factory.createStringLiteral(moduleName),
					undefined
				)

				Interpolator.before(beforeNode, InterpolationContentType.Import, () => newImportDecl!)
			}
		}

		for (let specifier of getState().persistedImportNodes) {
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
		let importDecl = transformContext.helper.imports.getImportFromModule(moduleName, transformSession.sourceFile)
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
			let type = transformContext.helper.symbol.resolveDeclaration(specifier, transformContext.helper.isTypeDeclaration)
			if (type) {
				removeOnce(specifier)
			}
		}
	}
}

definePostVisitCallback(Modifier.applyInterpolation)
