import type TS from 'typescript'
import {checker} from './checker'
import {helper, modifier, PropertyAccessingNode, ts} from '../../base'
import {ContextState} from './context-state'
import {ContextType} from './context-tree'
import {VisitingTree} from './visiting-tree'


/** 
 * A source file, a method, or a namespace, a function, an arrow function
 * create a context.
 * Otherwise, a logic or flow statement will also create a context.
 */
export class Context {

	readonly nodeDepth: number
	readonly nodeIndex: number
	readonly node: TS.Node
	readonly parent: Context | null
	readonly children: Context[] = []
	readonly state: ContextState

	/** 
	 * All local variable names, and whether each one was observed.
	 * It can also help to query in which context special variable exists.
	 */
	private variableObserved: Map<string, boolean> = new Map()

	/** All get expressions. */
	private getExpressions: PropertyAccessingNode[] = []

	constructor(type: ContextType, node: TS.Node, parent: Context | null) {
		this.nodeDepth = VisitingTree.current.depth
		this.nodeIndex = VisitingTree.current.index
		this.node = node
		this.parent = parent
		this.state = new ContextState(type, this)

		if (this.state.type === ContextType.FunctionLike) {
			this.checkObservedParameters()
		}
	}

	/** Whether has declared a variable by name. */
	hasDeclaredVariable(name: string): boolean {
		return this.variableObserved.has(name)
	}

	/** Get whether has observed a declared variable by name. */
	getVariableObserved(name: string): boolean {
		return this.variableObserved.get(name)!
	}

	private checkObservedParameters() {

		// Examine this parameter.
		// Assume `this` is observed.
		// `var a = this.a` -> observed.
		// `var b = a.b` -> observed.
		if (ts.isMethodDeclaration(this.node)
			|| ts.isFunctionDeclaration(this.node)
			|| ts.isFunctionExpression(this.node)
			|| ts.isArrowFunction(this.node)
			|| ts.isSetAccessorDeclaration(this.node)
		) {
			let parameters = this.node.parameters

			// If re-declare `this` parameter.
			for (let param of parameters) {
				let typeNode = param.type
				let observed = false

				if (typeNode) {
					observed = checker.isTypeNodeObserved(typeNode)
				}

				this.variableObserved.set(param.name.getText(), observed)
			}
		}

		// Broadcast observed from parent calling to all parameters.
		// `a.b.map((item) => {return item.value})`
		// `a.b.map(item => item.value)`
		// `a.b.map(function(item){return item.value})`
		if (ts.isFunctionDeclaration(this.node)
			|| ts.isFunctionExpression(this.node)
			|| ts.isArrowFunction(this.node)
		) {
			if (ts.isCallExpression(this.node.parent)) {
				let exp = this.node.parent.expression
				if (helper.isPropertyAccessing(exp)) {

					// `a.b`
					let callFrom = exp.expression
					if (checker.canObserve(callFrom) && checker.isObserved(callFrom)) {
						let parameters = this.node.parameters
						this.makeParametersObserved(parameters)
					}
				}
			}
		}
	}

	private makeParametersObserved(parameters: TS.NodeArray<TS.ParameterDeclaration>) {
		for (let param of parameters) {
			let beObject = helper.isNodeObjectType(param)
			if (beObject) {
				this.variableObserved.set(param.name.getText(), true)
			}
		}
	}

	/** Add a child context. */
	addChildContext(child: Context) {
		this.children.push(child)
	}

	/** Initialize after children ready. */
	postInit() {
		this.state.postInit()
	}

	/** Visit each child node recursively. */
	visitChildNode(node: TS.Node) {
		
		// Add parameters.
		if (ts.isParameter(node)) {
			this.addParameter(node)
		}

		// Check each variable declarations.
		else if (ts.isVariableDeclaration(node)) {
			this.addVariableDeclaration(node)
		}

		// Add property declaration.
		else if (helper.isPropertyAccessing(node)) {
			this.addGetExpression(node)
		}

		// Check return statement.
		else if (ts.isReturnStatement(node)) {
			this.addGetExpressionSplit(node)
		}
	}

	private addParameter(node: TS.ParameterDeclaration) {
		let typeNode = node.type
		let observed = false

		if (typeNode) {
			observed = checker.isTypeNodeObserved(typeNode)
		}

		if (!observed) {
			observed = checker.isParameterObservedFromCallingBroadcasted(node)
		}

		this.variableObserved.set(node.name.getText(), observed)
	}

	private addVariableDeclaration(node: TS.VariableDeclaration) {
		let observed = checker.isVariableDeclarationObserved(node)
		let name = node.name.getText()
		this.variableObserved.set(name, observed)
	}

	/** Add a get expression, already tested and knows should observe it. */
	private addGetExpression(node: PropertyAccessingNode) {
		if (checker.isAccessingObserved(node)) {
			this.getExpressions.push(node)
		}
	}

	/** 
	 * Add a split for get expressions.
	 * Then get expressions will be splitted and output before it.
	 */
	private addGetExpressionSplit(node: TS.Node) {

		// Index of current children.
		let index = VisitingTree.getIndexOfDepth(this.nodeDepth + 1)


	}


	/** Output all expressions to append to a node. */
	outputExpressions(node: TS.Node): TS.Node | TS.Node[] {
		if (this.getExpressions.length === 0) {
			return node
		}

		if (this.state.nothingReturned) {
			return node
		}

		modifier.addNamedImport('onGetGrouped', '@pucelle/ff')
	}

	/** Do optimize. */
	optimize() {

	}
}


