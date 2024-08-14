import type TS from 'typescript'
import {factory, MutableMask, Scoping, ts} from '../../../base'
import {VariableNames} from './variable-names'


/** Help to manage all value nodes. */
export class TemplateValues {

	readonly rawNodes: TS.Expression[]

	private valueHash: Map<string, number> = new Map()
	private outputNodes: TS.Expression[] = []
	private indicesMutable: Map<number, MutableMask> = new Map()
	private indicesOutputAsMutable: Map<number, boolean> = new Map()
	private indicesTransferred: Set<number> = new Set()

	constructor(rawNodes: TS.Expression[]) {
		this.rawNodes = rawNodes
		this.checkIndicesMutable()
	}
	
	/** Removes all static values and remap value indices. */
	private checkIndicesMutable() {
		for (let i = 0; i < this.rawNodes.length; i++) {
			let node = this.rawNodes[i]
			this.indicesMutable.set(i, Scoping.testMutable(node))
		}
	}

	/** Returns whether the value at specified index is mutable. */
	isIndexMutable(index: number): boolean {
		return (this.indicesMutable.get(index)! & MutableMask.Mutable) > 0
	}

	/** Returns whether the value at specified index can turn from mutable to static. */
	isIndexCanTurnStatic(index: number): boolean {
		return (this.indicesMutable.get(index)! & MutableMask.CantTurnStatic) === 0
	}

	/** Returns whether the value at specified index has been outputted as mutable. */
	isIndexOutputAsMutable(index: number): boolean {
		return this.indicesOutputAsMutable.get(index)!
	}

	/** Returns whether the value at specified index has been transferred to topmost scope. */
	isIndexTransferredToTopmost(index: number): boolean {
		return this.indicesTransferred.has(index)
	}

	/** Get raw value node at index. */
	getRawNode(index: number): TS.Expression {
		return this.rawNodes[index]
	}

	/** 
	 * Use value node at index, either `$values[0]`, or static raw node.
	 * Can only use it when outputting update.
	 * If `forceStatic`, will treat it as static value node,
	 * must check `isIndexCanTurnStatic()` firstly and ensure it can.
	 */
	outputNodeAt(index: number, forceStatic: boolean = false): TS.Expression {
		let rawValueNode = this.rawNodes[index]

		// Output static raw node.
		if (!this.isIndexMutable(index) || forceStatic && this.isIndexCanTurnStatic(index)) {
			this.indicesOutputAsMutable.set(index, false)
			return Scoping.transferToTopmostScope(rawValueNode, this.transferNodeToTopmostScope.bind(this, index))
		}

		// Output from value list.
		else {
			this.indicesOutputAsMutable.set(index, true)
			return this.outputNode(rawValueNode, false)
		}
	}

	/** 
	 * Replace local variables to values reference:
	 * `this.onClick` -> `$context.onClick`
	 * `localVariableName` -> `$values[...]`, and add it to output value list.
	 */
	private transferNodeToTopmostScope(index: number, node: TS.Identifier | TS.ThisExpression): TS.Expression {

		// Move variable name as an item of output value list.
		if (ts.isIdentifier(node)) {
			this.indicesTransferred.add(index)
			return this.outputNode(node, true)
		}

		// Replace `this` to `$context`.
		else {
			return factory.createIdentifier(VariableNames.context)
		}
	}

	/** 
	 * Output a node, append it to output value node list,
	 * and returns the output node.
	 */
	private outputNode(node: TS.Expression, transferringToTopmostScope: boolean): TS.Expression {
		let hash = Scoping.hashNode(node).name
		let valueIndex: number

		if (this.valueHash.has(hash)) {
			valueIndex = this.valueHash.get(hash)!
		}
		else {
			valueIndex = this.outputNodes.length
			this.outputNodes.push(node)
			this.valueHash.set(hash, valueIndex)
		}

		let valueName = transferringToTopmostScope
			? VariableNames.latestValues
			: VariableNames.values

		return factory.createElementAccessExpression(
			factory.createIdentifier(valueName),
			factory.createNumericLiteral(valueIndex)
		)
	}

	/** 
	 * Bundle a interpolation strings and value indices to a new expression.
	 * It uses `indices[0]` as new index.
	 * `...${value}...` -> `${'...' + value + '...'}`
	 */
	bundleValueIndices(strings: string[], valueIndices: number[]) {
		let value: TS.Expression = factory.createStringLiteral(strings[0])

		// string[0] + values[0] + strings[1] + ...
		for (let i = 1; i < strings.length; i++) {
			value = factory.createBinaryExpression(
				value,
				factory.createToken(ts.SyntaxKind.PlusToken),
				this.rawNodes[valueIndices[i - 1]]
			)

			value = factory.createBinaryExpression(
				value,
				factory.createToken(ts.SyntaxKind.PlusToken),
				factory.createStringLiteral(strings[i])
			)
		}

		this.rawNodes[valueIndices[0]] = value

		// Other values become undefined, and will be removed in the following remapping step.
		for (let i = 1; i < valueIndices.length; i++) {
			this.rawNodes[valueIndices[i]] = factory.createIdentifier('undefined')
		}

		// Byte OR of all indices' mutable.
		let reduced = valueIndices.reduce((a, b) => a | b, 0)
		this.indicesMutable.set(valueIndices[0], reduced)
	}

	/** Output all values to an array. */
	output(): TS.Expression {
		return factory.createArrayLiteralExpression(
			this.outputNodes,
			false
		)  
	}
}