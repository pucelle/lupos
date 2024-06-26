export namespace ContextOutput {
	
	/** Output all expressions to append to a node. */
	outputExpressions(node: ts.Node): ts.Node | ts.Node[] {
		if (this.getExpressions.length === 0) {
			return node
		}

		if (this.state.nothingReturned) {
			return node
		}

		this.modifier.addNamedImport('onGetGrouped', '@pucelle/ff')

		let type = this.state.type
		let onGetStats = GetExpressionsBuilder.buildExpressions(this.getExpressions, this.helper)

		if (type === ContextType.BlockLike) {
			return this.modifier.addExpressionsToBlock(node as ts.Block | ts.SourceFile, onGetStats)
		}
		else if (type === ContextType.FunctionLike) {
			if (this.helper.ts.isArrowFunction(node)) {
				return this.modifier.addExpressionsToArrowFunction(node, onGetStats)
			}
		}
		else if (type === ContextType.Conditional) {
			if (this.helper.ts.isConditionalExpression(node)) {
				return this.modifier.addExpressionsToSingleExpression(node, onGetStats)
			}
		}
		else if (this.helper.ts.isConditionalExpression(node)) {
			if (this.state.type === ContextType.Conditional) {
				return this.modifier.addExpressionsToSingleExpression(node, onGetStats)
			}
			else if (this.state.type === ContextType.ConditionalContent) {
				
			}
		}

		throw new Error(`Node of kind "${node.kind}" cant output expressions!\n` + node.getFullText())
	}
}