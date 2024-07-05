import type TS from 'typescript'
import {observedChecker} from './observed-checker'
import {helper, PropertyAccessingNode, ts} from '../../base'
import {ContextState} from './context-state'
import {ContextType} from './context-tree'
import {VisitingTree} from './visiting-tree'
import {ContextInterpolator} from './context-interpolator'
import {ContextVariables} from './context-variables'


/** 
 * A source file, a method, or a namespace, a function, an arrow function
 * create a context.
 * Otherwise, a logic or flow statement will also create a context.
 */
export class Context {

	readonly type: ContextType
	readonly visitingIndex: number
	readonly node: TS.Node
	readonly parent: Context | null
	readonly children: Context[] = []
	readonly state: ContextState
	readonly variables: ContextVariables
	readonly interpolator: ContextInterpolator

	constructor(type: ContextType, node: TS.Node, parent: Context | null) {
		this.type = type
		this.visitingIndex = VisitingTree.current.index
		this.node = node
		this.parent = parent
		this.state = new ContextState(this)
		this.variables = new ContextVariables(this)
		this.interpolator = new ContextInterpolator(this)

		if (parent) {
			parent.enterChild(this)
		}
	}

	/** 
	 * Initialize after children contexts are ready,
	 * and current context will exit.
	 */
	beforeExit() {
		this.optimize()
		this.interpolator.insertRestCaptured()

		if (this.parent) {
			this.parent.leaveChild(this)
		}
	}

	/** Enter a child context. */
	enterChild(child: Context) {
		this.children.push(child)
	}

	/** Leave a child context. */
	leaveChild(child: Context) {
		this.state.mergeChildContext(child)

		if (child.state.isBreakLikeInside()) {
			this.addBreak(child.visitingIndex)
		}
	}

	/** Visit context node and each descendant node inside current context. */
	visitNode(node: TS.Node) {
		
		// Add parameters.
		if (ts.isParameter(node)) {
			this.variables.visitParameter(node)
		}

		// Check each variable declarations.
		else if (ts.isVariableDeclaration(node)) {
			this.variables.visitVariable(node)
		}

		// Add property declaration.
		else if (helper.isPropertyAccessing(node)) {
			this.addGet(node)
		}

		// `break` or `continue`, or empty `return`.
		else if (ts.isReturnStatement(node) && !node.expression || ts.isBreakOrContinueStatement(node)) {
			this.state.applyBreak(true)
			this.addBreak(VisitingTree.current.index)
		}
	}

	/** Add a get expression, already tested and knows should observe it. */
	private addGet(node: PropertyAccessingNode) {
		if (this.state.nothingReturned) {
			return
		}

		if (!observedChecker.isAccessingObserved(node)) {
			return
		}

		// Use a reference variable to replace expression.
		if (observedChecker.shouldReference(node.expression)) {
			let index = VisitingTree.current.index
			this.interpolator.referenceAndCapture(node, index)
		}
		else {
			this.interpolator.capture(node, false)
		}
	}

	/** Add a break and output expressions before specified position. */
	private addBreak(index: number) {
		let parentIndex = VisitingTree.getParentIndex(index)
		let parentNode = VisitingTree.getNode(parentIndex)

		// Insert before expression statement.
		if (ts.isExpressionStatement(parentNode)) {
			index = parentIndex
		}

		this.interpolator.breakCaptured(index)
	}

	/** 
	 * Do optimize, after all descendant nodes are ready.
	 * Normally it will hoist captured dependencies higher.
	 */
	private optimize() {
		
	}

	/** For itself or descendant node, output all expressions and append them before, or replace it. */
	output(node: TS.Node | TS.Node[], index: number): TS.Node | TS.Node[] {
		let output = this.interpolator.output(node, index)

		// Parent context may output before or after current context node.
		if (node === this.node && this.parent) {
			output = this.parent.interpolator.output(output, index)
		}
		
		return output
	}
}
