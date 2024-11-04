import type TS from 'typescript'
import {factory, Helper, Interpolator, MutableMask, ScopeTree, ts} from '../../base'
import {VariableNames} from './variable-names'
import {TreeParser} from './tree'


/** Help to manage all value nodes. */
export class TemplateValues {

	readonly rawValueNodes: TS.Expression[]
	readonly tree: TreeParser

	private valueHash: Map<string, number> = new Map()
	private outputNodes: TS.Expression[] = []
	private indicesMutable: Map<number, MutableMask | 0> = new Map()
	private indicesOutputted: Set<number> = new Set()
	private transferredLatestNames: Map<string, number> = new Map()

	constructor(valueNodes: TS.Expression[], tree: TreeParser) {
		this.rawValueNodes = valueNodes
		this.tree = tree
		this.checkIndicesMutable()
	}
	
	/** Removes all static values and remap value indices. */
	private checkIndicesMutable() {
		for (let i = 0; i < this.rawValueNodes.length; i++) {
			let node = this.rawValueNodes[i]
			this.indicesMutable.set(i, ScopeTree.testMutable(node))
		}
	}

	/** Returns whether the value at specified index is mutable. */
	isIndexMutable(valueIndex: number): boolean {
		return (this.indicesMutable.get(valueIndex)! & MutableMask.Mutable) > 0
	}

	/** Returns whether the value at specified index can turn from mutable to static. */
	isIndexCanTurnStatic(valueIndex: number): boolean {
		return (this.indicesMutable.get(valueIndex)! & MutableMask.CantTransfer) === 0
	}

	/** Returns whether the value at specified index has been outputted as mutable. */
	isIndexOutputted(valueIndex: number): boolean {
		return this.indicesOutputted.has(valueIndex)!
	}

	/** Get raw value node at index. */
	getRawValue(valueIndex: number): TS.Expression {
		return this.rawValueNodes[valueIndex]
	}

	/** 
	 * For binding parameter list like `:binding=${a, b}` or `:binding=${(a, b)}`,
	 * get mutable state of each of `a, b`.
	 */
	getRawParameterListMutable(rawParamNodes: TS.Expression[], valueIndex: number): boolean[] {
		if (rawParamNodes.length <= 1) {
			return rawParamNodes.map(() => this.isIndexMutable(valueIndex))
		}

		return rawParamNodes.map(rawValueNode => {
			return (ScopeTree.testMutable(rawValueNode) & MutableMask.Mutable) > 0
		})
	}

	/** 
	 * Use value node at index, either `$values[0]`, or static raw node.
	 * Can only use it when outputting update.
	 * If `asCallback`, will treat it as static value node,
	 * must check `isIndexCanTurnStatic()` firstly and ensure it can.
	 */
	outputValue(
		strings: string[] | null = null,
		valueIndices: number[] | null,
		asCallback: boolean = false
	): {
		joint: TS.Expression,
		valueNodes: TS.Expression[],
	} {

		// Like `.booleanProp`.
		if (!strings && !valueIndices) {
			return {
				joint: factory.createTrue(),
				valueNodes: [],
			}
		}

		if (valueIndices === null) {
			return {
				joint: factory.createStringLiteral(strings![0]),
				valueNodes: [],
			}
		}
		
		let valueNodes = valueIndices.map(valueIndex => {
			let rawValueNode = this.rawValueNodes[valueIndex]
			let mutable = this.isIndexMutable(valueIndex)
			let canTurn = this.isIndexCanTurnStatic(valueIndex)
			let asStatic = !mutable || asCallback && canTurn

			return this.outValueNodeOfIndex(rawValueNode, valueIndex, asStatic)
		})

		let joint: TS.Expression

		if (strings) {
			joint = this.bundleStringsAndValueNodes(strings, valueIndices, valueNodes)
		}
		else {
			joint = valueNodes[0]
		}
		
		return {
			joint,
			valueNodes,
		}
	}

	/** Output a raw node of full or partial specified index. */
	private outValueNodeOfIndex(rawValueNode: TS.Expression, valueIndex: number, asStatic: boolean): TS.Expression {

		// Output static node.
		if (asStatic) {
			let interpolated = Interpolator.outputNodeSelf(rawValueNode) as TS.Expression

			let transferred = ScopeTree.transferToTopmostScope(
				interpolated,
				rawValueNode,
				this.transferNodeToTopmostScope.bind(this, valueIndex)
			)

			return transferred
		}

		// Output from value list.
		else {
			this.indicesOutputted.add(valueIndex)
			return this.outputNodeAsValue(rawValueNode, false)
		}
	}

	/** 
	 * Replace local variables to values reference:
	 * `this.onClick` -> `$context.onClick`
	 * `localVariableName` -> `$values[...]`, and add it to output value list.
	 */
	private transferNodeToTopmostScope(
		valueIndex: number,
		node: TS.Identifier | TS.ThisExpression,
		insideFunction: boolean, 
	): TS.Expression {

		// Move variable name as an item to output value list.
		if (ts.isIdentifier(node)) {
			this.indicesOutputted.add(valueIndex)
			return this.outputNodeAsValue(node, insideFunction)
		}

		// Replace `this` to `$context`.
		else {
			return factory.createIdentifier(VariableNames.context)
		}
	}

	/** 
	 * Output a node, append it to output value node list,
	 * and returns it's reference value item.
	 * If `transferringWithinFunction`, move value to topmost scope and add referenced value to value list.
	 */
	private outputNodeAsValue(rawNode: TS.Expression, transferringWithinFunction: boolean): TS.Expression {
		let hash = ScopeTree.hashNode(rawNode).name
		let valueIndex: number

		if (this.valueHash.has(hash)) {
			valueIndex = this.valueHash.get(hash)!
		}
		else {
			let interpolated = Interpolator.outputNodeSelf(rawNode) as TS.Expression

			valueIndex = this.outputNodes.length
			this.outputNodes.push(interpolated)
			this.valueHash.set(hash, valueIndex)
		}

		if (transferringWithinFunction) {
			let latestName = this.tree.makeUniqueLatestName()
			this.transferredLatestNames.set(latestName, valueIndex)
			return factory.createIdentifier(latestName)
		}
		else {
			return factory.createElementAccessExpression(
				factory.createIdentifier(VariableNames.values),
				factory.createNumericLiteral(valueIndex)
			)
		}
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

		
		let firstRawNode = this.getRawValue(valueIndices[0])

		// '' + ... if it's not a string type of value.
		if (!ts.isStringLiteral(parts[0])
			&& !Helper.types.isStringType(Helper.types.typeOf(firstRawNode))
		) {
			parts.unshift(factory.createStringLiteral(''))
		}

		
		return Helper.pack.bundleBinaryExpressions(parts, ts.SyntaxKind.PlusToken)
	}

	/** 
	 * Add a custom value to value list,
	 * and return reference of this value.
	 */
	outputCustomValue(node: TS.Expression): TS.Expression {
		let valueIndex = this.outputNodes.length
		this.outputNodes.push(node)
		this.indicesOutputted.add(valueIndex)

		return factory.createElementAccessExpression(
			factory.createIdentifier(VariableNames.values),
			factory.createNumericLiteral(valueIndex)
		)
	}

	/** Output a single value from a raw node. */
	outputRawValue(rawNode: TS.Expression, valueIndex: number, asCallback: boolean = false): TS.Expression {
		let mutableMask = ScopeTree.testMutable(rawNode)
		let mutable = (mutableMask & MutableMask.Mutable) > 0
		let canTurn = (mutableMask & MutableMask.CantTransfer) === 0
		let asStatic = !mutable || asCallback && canTurn

		return this.outValueNodeOfIndex(rawNode, valueIndex, asStatic)
	}

	/** 
	 * Output custom values from a list of raw nodes list.
	 * Use for passing several parameters to a binding,
	 * like `:binding=${value1, value2}`, or `:binding=${(value1, value2)}`.
	 */
	outputRawValueList(rawNodes: TS.Expression[], valueIndex: number, asCallback: boolean = false): TS.Expression[] {
		let valueNodes = rawNodes.map(rawNode => this.outputRawValue(rawNode, valueIndex, asCallback))
		return valueNodes
	}

	/** Output latest names and associated value indices. */
	outputTransferredLatestNames(): Iterable<[string, number]> {
		return this.transferredLatestNames.entries()
	}

	/** Output all values to an array. */
	output(): TS.ArrayLiteralExpression {
		return factory.createArrayLiteralExpression(
			this.outputNodes,
			true
		)  
	}
}