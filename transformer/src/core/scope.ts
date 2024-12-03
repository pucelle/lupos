import * as ts from 'typescript'
import {VisitTree} from './visit-tree'
import {helper} from './global'
import {VariableScopeTree} from './scope-tree'
import {InterpolationContentType, Interpolator} from './interpolator'
import {Scope} from '../lupos-ts-module'


type ScopeNode = ts.FunctionLikeDeclaration | ts.ForStatement | ts.ForOfStatement | ts.ForInStatement | ts.Block | ts.SourceFile


/** Mark all variables with a context. */
export class VariableScope extends Scope {

	declare readonly parent: VariableScope | null

	constructor(node: ScopeNode, parent: VariableScope | null) {
		super(node, parent, helper)
	}

	/** Whether can add more statements inside. */
	canAddStatements(): boolean {
		return !helper.isFunctionLike(this.node)
			&& !ts.isForStatement(this.node)
			&& !ts.isForOfStatement(this.node)
			&& !ts.isForInStatement(this.node)
	}

	/** Whether declared local variable as const. */
	isLocalVariableConstLike(name: string): boolean {
		if (!this.variables.has(name)) {
			return false
		}
		
		let node = this.variables.get(name)
		if (!node) {
			return false
		}

		if (ts.isVariableDeclaration(node)) {
			return (node.parent.flags & ts.NodeFlags.Const) > 0
		}
		else if (ts.isParameter(node)) {
			return false
		}

		// Imported, or function / class declaration
		else {
			return true
		}
	}

	/** 
	 * Add a non-repetitive variable name in scope,
	 * make it have no conflict with current scope, and ancestral scopes.
	 */
	makeUniqueVariable(prefix: string): string {
		let scope = this.findClosestToAddStatements()
		let seed = 0
		let name = prefix + seed++

		while (scope.hasVariable(name)) {
			name = prefix + seed++
		}

		scope.variables.set(name, null)

		return name
	}

	/** Add a variable to current scope. */
	addVariable(name: string) {
		VariableScopeTree.addVariableToScope(this, name)
	}

	/** 
	 * Find an ancestral scope, and a child,
	 * which can insert variable before it.
	 */
	findClosestToAddStatements(): VariableScope {
		let scope: VariableScope = this

		while (!scope.canAddStatements()) {
			scope = scope.parent!
		}

		return scope
	}
	
	/** 
	 * Add statement to the beginning position of current scope.
	 * If current scope can't add statements, will try parent scope.
	 * Several variable declarations will be stacked to a variable statement.
	 */
	addStatements(stats: ts.Statement[], order?: number) {
		let toIndex = this.getTargetNodeToAddStatements()
		Interpolator.before(toIndex, InterpolationContentType.Declaration, () => stats, order)
	}

	/** Get best node to add variable before it. */
	getTargetNodeToAddStatements(): ts.Node {
		let toNode = VisitTree.getFirstChild(this.node)!

		// Insert before the first not import statements.
		if (this.isTopmost()) {
			let beforeNode = (this.node as ts.SourceFile).statements.find(n => !ts.isImportDeclaration(n))
			if (beforeNode) {
				toNode = beforeNode
			}
		}

		return toNode
	}
}

