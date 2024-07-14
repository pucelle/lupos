import type TS from 'typescript'
import {ObservedChecker} from './observed-checker'
import {helper, modifier, PropertyAccessNode, ts, visiting} from '../../base'
import {ContextState} from './context-state'
import {ContextTargetPosition, ContextTree, ContextType} from './context-tree'
import {ContextVariables} from './context-variables'
import {ContextCapturer} from './context-capturer'


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
	readonly capturer: ContextCapturer

	constructor(type: ContextType, node: TS.Node, parent: Context | null) {
		this.type = type
		this.visitingIndex = visiting.current.index
		this.node = node
		this.parent = parent
		this.state = new ContextState(this)
		this.variables = new ContextVariables(this)
		this.capturer = new ContextCapturer(this)

		if (parent) {
			parent.enterChild(this)
		}
	}

	/** 
	 * Call after children contexts are ready,
	 * and current context will exit.
	 */
	beforeExit() {
		this.optimize()
		this.capturer.beforeExit()

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

		if (child.state.isInnerFlowStop()) {
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
		else if (helper.access.isAccess(node)) {
			this.addGet(node)
		}

		// `break` or `continue`, or empty `return`, or body of arrow function.
		else if (ts.isReturnStatement(node) && !node.expression
			|| ts.isBreakOrContinueStatement(node)
		) {
			this.state.applyInnerBreakLike(true)
			this.addBreak(visiting.current.index)
		}
	}

	/** Add a get expression, already tested and knows should observe it. */
	private addGet(node: PropertyAccessNode) {
		if (this.state.nothingReturned) {
			return
		}

		if (!ObservedChecker.isAccessingObserved(node)) {
			return
		}

		let index = visiting.current.index
		let position: ContextTargetPosition | null = null

		// Use a reference variable to replace expression.
		if (ObservedChecker.shouldReference(node.expression)) {
			let expIndex = visiting.getFirstChildIndex(index)!
			position = this.capturer.reference(expIndex)
		}

		// Use a reference variable to replace name.
		if (ObservedChecker.shouldReference(helper.access.getNameNode(node))) {
			let nameIndex = visiting.getLastChildIndex(index)!
			position = this.capturer.reference(nameIndex) || position
		}

		if (position) {

			// Capture immediately and insert it into position.
			if (position.interruptOnPath) {
				position.context.capturer.addCapturedTo([index], position.index)
			}

			// Capture by target context.
			else {
				position.context.capturer.capture(index)
			}
		}
		else {
			this.capturer.capture(index)
		}

		// Move variable declaration list forward.
		// Should move codes to optimize step later.
		if (this.type === ContextType.IterationInitializer) {
			let toPosition = ContextTree.findClosestPositionToAddStatement(
				this.visitingIndex, this
			)

			modifier.moveOnce(this.visitingIndex, toPosition.index)
		}	
	}

	/** Add a break and output expressions before specified position. */
	private addBreak(index: number) {
		let parentIndex = visiting.getParentIndex(index)!
		let parentNode = visiting.getNode(parentIndex)

		// Insert before expression statement.
		if (ts.isExpressionStatement(parentNode)) {
			index = parentIndex
		}

		this.capturer.breakCaptured(index)
	}

	/** 
	 * Do optimize, after all descendant nodes are ready.
	 * Normally it will hoist captured dependencies higher.
	 */
	private optimize() {
		
	}
}
