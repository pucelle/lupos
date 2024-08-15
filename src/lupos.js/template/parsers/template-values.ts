import type TS from 'typescript'
import {factory, Helper, MutableMask, Scoping, ts} from '../../../base'
import {VariableNames} from './variable-names'


/** Help to manage all value nodes. */
export class TemplateValues {

	readonly valueNodes: TS.Expression[]

	private valueHash: Map<string, number> = new Map()
	private outputNodes: TS.Expression[] = []
	private indicesMutable: Map<number, MutableMask> = new Map()
	private indicesOutputAsMutable: Map<number, boolean> = new Map()
	private indicesTransferred: Set<number> = new Set()

	constructor(valueNodes: TS.Expression[]) {
		this.valueNodes = valueNodes
		this.checkIndicesMutable()
	}
	
	/** Removes all static values and remap value indices. */
	private checkIndicesMutable() {
		for (let i = 0; i < this.valueNodes.length; i++) {
			let node = this.valueNodes[i]
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
		return this.valueNodes[index]
	}

	/** 
	 * Use value node at index, either `$values[0]`, or static raw node.
	 * Can only use it when outputting update.
	 * If `forceStatic`, will treat it as static value node,
	 * must check `isIndexCanTurnStatic()` firstly and ensure it can.
	 */
	outputValue(valueIndices: number[] | null, strings: string[] | null = null, forceStatic: boolean = false): TS.Expression {
		if (valueIndices === null) {
			return factory.createStringLiteral(strings![0])
		}
		
		let valueNodes = valueIndices.map(index => {
			let valueNode = this.valueNodes[index]
			let mutable = this.isIndexMutable(index)
			let canTurn = this.isIndexCanTurnStatic(index)

			// Output static raw node.
			if (!mutable || forceStatic && canTurn) {
				this.indicesOutputAsMutable.set(index, false)
				return Scoping.transferToTopmostScope(valueNode, this.transferNodeToTopmostScope.bind(this, index))
			}

			// Output from value list.
			else {
				this.indicesOutputAsMutable.set(index, true)
				return this.outputValueNodeOf(valueNode, false)
			}
		})

		if (strings) {
			return this.bundleStringsAndValueNodes(strings, valueIndices, valueNodes)
		}
		else {
			return valueNodes[0]
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
			return this.outputValueNodeOf(node, true)
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
	private outputValueNodeOf(node: TS.Expression, transferringToTopmostScope: boolean): TS.Expression {
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
	private bundleStringsAndValueNodes(strings: string[], valueIndices: number[], valueNodes: TS.Expression[]): TS.Expression {
		let parts: TS.Expression[] = []

		// string[0] + values[0] + strings[1] + ...
		for (let i = 0; i < strings.length; i++) {
			if (strings[i]) {
				parts.push(factory.createStringLiteral(strings[i]))
			}

			if (i < strings.length - 1) {
				parts.push(valueNodes[i])
			}
		}

		
		let firstRawNode = this.getRawNode(valueIndices[0])

		// '' + ...
		if (!ts.isStringLiteral(parts[0])
			&& !Helper.types.isStringType(Helper.types.getType(firstRawNode))
		) {
			parts.unshift(factory.createStringLiteral(''))
		}


		let value = parts[0]

		for (let i = 1; i < parts.length; i++) {
			value = factory.createBinaryExpression(
				value,
				factory.createToken(ts.SyntaxKind.PlusToken),
				parts[i]
			)
		}

		return value
	}

	/** Output all values to an array. */
	output(): TS.Expression {
		return factory.createArrayLiteralExpression(
			this.outputNodes,
			false
		)  
	}
}