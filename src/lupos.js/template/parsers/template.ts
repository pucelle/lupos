import type TS from 'typescript'
import {HTMLNode, HTMLTree} from '../html-syntax'
import {HTMLTreeParser} from './html-tree'
import {factory, MutableMask, Scoping, ts} from '../../../base'
import {VariableNames} from './variable-names'


export type TemplateType = 'html' | 'svg'

/** Extends attributes by merging class and style attributes, and setting normal attributes.  */
export function extendsAttributes(el: Element, attributes: {name: string, value: string}[]) {
	for (let {name, value} of attributes) {
		if ((name === 'class' || name === 'style') && el.hasAttribute(name)) {
			if (name === 'style') {
				value = (el.getAttribute(name) as string) + '; ' + value
			}
			else if (name === 'class') {
				value = (el.getAttribute(name) as string) + ' ' + value
			}
		}

		el.setAttribute(name, value)
	}
}


/**
 * Parse template string value expressions,
 * it will add a parsed to a TemplateMaker instance and add it to source file,
 * and return a expression to replace original template node.
 */
export class TemplateParser {

	readonly type: TemplateType
	readonly values: TemplateValues

	private readonly treeParsers: HTMLTreeParser[] = []

	constructor(type: TemplateType, string: string, values: TS.Expression[]) {
		this.type = type
		this.values = new TemplateValues(values)

		let tree = HTMLTree.fromString(string)
		this.addTreeParser(tree, null, null)
	}

	/** Add a tree and parent. */
	addTreeParser(tree: HTMLTree, parent: HTMLTreeParser | null, fromNode: HTMLNode | null): HTMLTreeParser {
		let parser = new HTMLTreeParser(this, tree, parent, fromNode)
		this.treeParsers.push(parser)

		return parser
	}

	/** Create a template element with `html` as content. */
	createTemplateFromHTML(html: string) {
		let template = document.createElement('template')
		template.innerHTML = html

		return template
	}


	/** 
	 * Clone parsed result,
	 * copy fragment and all the nodes,
	 * links slots to those nodes with cached node indices.
	 */
	cloneParsedResult(sharedResult: SharedParsedReulst, el: HTMLElement | null): ParsedResult {
		let {template, slots, rootAttributes} = sharedResult
		let fragment = template.content.cloneNode(true) as DocumentFragment
		let nodes: Node[] = []

		if (rootAttributes) {
			if (!el) {
				throw new Error('A context must be provided when rendering `<template>...`!')
			}

			extendsAttributes(el, rootAttributes)
		}

		if (slots.length > 0) {
			let nodeIndex = 0
			let slotIndex = 0
			let walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT, null)
			let node: Node | null
			let ended = false

			if (rootAttributes) {
				while (slotIndex < slots.length && slots[slotIndex].nodeIndex === 0) {
					nodes.push(el!)
					slotIndex++
				}
				nodeIndex = 1
			}

			if (slotIndex < slots.length) {
				while (node = walker.nextNode()) {
					while (slots[slotIndex].nodeIndex === nodeIndex) {
						nodes.push(node)
						slotIndex++
						
						if (slotIndex === slots.length) {
							ended = true
							break
						}
					}

					if (ended) {
						break
					}

					nodeIndex++
				}
			}
		}

		return {
			fragment,
			slots,
			nodes,
		}
	}

	output(): TS.Expression {

	}

	private outputInit() {
		
	}

	private outputUpdate() {

	}
}


/** Help to manage all value nodes. */
class TemplateValues {

	readonly rawNodes: TS.Expression[]

	private valueHash: Map<string, number> = new Map()
	private outputNodes: TS.Expression[] = []
	private indicesMutable: Map<number, MutableMask> = new Map()

	constructor(values: TS.Expression[]) {
		this.rawNodes = values
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
	canTurnStatic(index: number): boolean {
		return (this.indicesMutable.get(index)! & MutableMask.CantTurn) === 0
	}

	/** Get raw value node at index. */
	getRawNode(index: number): TS.Expression {
		return this.rawNodes[index]
	}

	/** 
	 * Use value node at index, either `$values[0]`, or static raw node.
	 * Can only use it when outputting update.
	 * If `forceStatic`, will treat it as static value node,
	 * must check `canTurnStatic()` firstly and ensure it can.
	 */
	outputValueNodeAt(index: number, forceStatic: boolean = false): TS.Expression {
		let rawValueNode = this.rawNodes[index]

		// Output static raw node.
		if (!this.isIndexMutable(index) || forceStatic) {
			return Scoping.transferToTopmostScope(rawValueNode, this.transferNodeToTopmostScope)
		}

		// Output from value list.
		else {
			return this.outputValueNode(rawValueNode)
		}
	}

	/** 
	 * Output a node, append it to output value node list,
	 * and returns the output node.
	 */
	private outputValueNode(node: TS.Expression): TS.Expression {
		let hash = Scoping.hashNode(node).name
		let valueIndex: number

		if (this.valueHash.has(hash)) {
			valueIndex = this.valueHash.get(hash)!
		}
		else {
			valueIndex = this.rawNodes.length
			this.outputNodes.push(node)
			this.valueHash.set(hash, valueIndex)
		}

		return factory.createElementAccessExpression(
			factory.createIdentifier(VariableNames.values),
			factory.createNumericLiteral(valueIndex)
		)
	}

	/** 
	 * Replace local variables to values reference:
	 * `this.onClick` -> `$context.onClick`
	 * `localVariableName` -> `$values[...]`, and add it to output value list.
	 */
	private transferNodeToTopmostScope(node: TS.Identifier | TS.ThisExpression): TS.Expression {

		// Move variable name as an item of output value list.
		if (ts.isIdentifier(node)) {
			return this.outputValueNode(node)
		}

		// Replace `this` to `$context`.
		else {
			return factory.createIdentifier(VariableNames.context)
		}
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

		// Mutable if any of original indices is mutable.
		this.indicesMutable.set(valueIndices[0], valueIndices.some(i => this.indicesMutable.get(i)))
	}
}