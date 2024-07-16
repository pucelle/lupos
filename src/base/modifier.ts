import {ListMap} from '../utils'
import type TS from 'typescript'
import {factory, sourceFile, ts} from './global'
import {helper} from './helper'
import {InterpolationContentType, interpolator} from './interpolator'
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
			interpolator.replace(toIndex, InterpolationContentType.Normal, () => member)
		}
		else if (preferInsertToHead) {
			interpolator.prepend(classIndex, InterpolationContentType.Normal, () => member)
		}
		else {
			interpolator.append(classIndex, InterpolationContentType.Normal, () => member)
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
	 * `a.b()` -> `var ..., _ref_ = a.b()`, and move it.
	 */
	export function addVariableAssignmentToList(fromIndex: number, toIndex: number, varName: string) {
		interpolator.before(toIndex, InterpolationContentType.VariableDeclaration, () => {
			let node = interpolator.outputChildren(fromIndex) as TS.Expression
			node = helper.pack.simplifyShallow(node) as TS.Expression
			
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
	 * `a.b()` -> `_ref_ = a.b()`, and move it.
	 */
	export function addReferenceAssignment(fromIndex: number, toIndex: number, refName: string) {
		interpolator.before(toIndex, InterpolationContentType.Reference, () => {
			let node = interpolator.outputChildren(fromIndex) as TS.Expression
			node = helper.pack.simplifyShallow(node) as TS.Expression

			return factory.createBinaryExpression(
				factory.createIdentifier(refName),
				factory.createToken(ts.SyntaxKind.EqualsToken),
				node
			)
		})
	}

	/** Add variables to target index as declaration statements or variable items. */
	export function addVariables(index: number, names: string[]) {
		let rawNode = visiting.getNode(index)
		let exps: TS.VariableDeclarationList | TS.VariableDeclaration[]
		let toIndex: number
		
		if (helper.pack.canPutStatements(rawNode)) {
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

			// Insert after import statements.
			if (ts.isSourceFile(rawNode)) {
				let beforeNode = rawNode.statements.find(n => !ts.isImportDeclaration(n))
				if (beforeNode) {
					toIndex = visiting.getIndex(beforeNode)
				}
				else {
					toIndex = visiting.getFirstChildIndex(index)!
				}
			}

			// Insert the first inner position of block.
			else if (helper.pack.canBlock(rawNode)) {
				toIndex = visiting.getFirstChildIndex(index)!
			}

			// Insert the statements of `case` of `default`.
			else {
				toIndex = visiting.getChildIndex(index, 1)
			}
		}

		// `for (let i = 0; ...) ...`
		else if (ts.isVariableStatement(rawNode)) {

			// First of variable list.
			toIndex = visiting.getFirstChildIndex(visiting.getFirstChildIndex(index)!)!

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
			throw new Error(`Cant add variables to "${helper.getText(visiting.getNode(index))}"!`)
		}

		interpolator.before(toIndex, InterpolationContentType.VariableDeclaration, () => exps)
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
				interpolator.append(namedImportsIndex, InterpolationContentType.Normal, () => namedImports)
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
				interpolator.before(toIndex, InterpolationContentType.Normal, () => importDecl!)
			}
		}
	}
}