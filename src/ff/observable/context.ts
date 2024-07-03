import type TS from 'typescript'
import {checker} from './checker'
import {helper, PropertyAccessingNode, ts} from '../../base'
import {ContextFlowState} from './context-flow-state'
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
	readonly flowState: ContextFlowState
	readonly variables: ContextVariables
	readonly interpolator: ContextInterpolator

	constructor(type: ContextType, node: TS.Node, parent: Context | null) {
		this.type = type
		this.visitingIndex = VisitingTree.current.index
		this.node = node
		this.parent = parent
		this.flowState = new ContextFlowState(this)
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
		this.addRest()

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
		if (this.flowState.visitChildContext(child)) {
			this.addSplit()
		}
	}

	/** Visit each descendant node inside current context. */
	visitNode(node: TS.Node) {
		
		// Add parameters.
		if (ts.isParameter(node)) {
			this.variables.markParameter(node)
		}

		// Check each variable declarations.
		else if (ts.isVariableDeclaration(node)) {
			this.variables.markVariable(node)
		}

		// Add property declaration.
		else if (helper.isPropertyAccessing(node)) {
			this.addGet(node)
		}

		// Check return and break statement.
		else if (this.flowState.visitNode(node)) {
			this.addSplit()
		}
	}

	/** Add a get expression, already tested and knows should observe it. */
	private addGet(node: PropertyAccessingNode) {
		if (!checker.isAccessingObserved(node)) {
			return
		}

		// Use a reference variable to replace expression.
		if (checker.shouldReference(node.expression)) {
			let index = VisitingTree.current.index
			this.interpolator.refExpAndCapture(node, index)
		}
		else {
			this.interpolator.capture(node, false)
		}
	}

	/** 
	 * Add a split for get expressions.
	 * Then get expressions will be splitted and output before current position.
	 */
	private addSplit() {
		this.interpolator.insertCaptured()
	}

	/** Add rest get expressions. */
	private addRest() {
		this.interpolator.insertRestCaptured()
	}

	/** 
	 * Do optimize, after all descendant nodes are ready.
	 * Normally it will hoist captured dependencies higher.
	 */
	private optimize() {

	}

	/** For a child or descendant node, output all expressions and append them before, or replace it. */
	output(node: TS.Node,index: number): TS.Node | TS.Node[] {
		return this.interpolator.output(node, index)
	}
}
