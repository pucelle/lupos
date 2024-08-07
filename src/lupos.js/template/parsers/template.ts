import type TS from 'typescript'
import {HTMLNode, HTMLTree} from '../html-syntax'
import {HTMLTreeParser} from './html-tree'
import {factory, helper, ts} from '../../../base'


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
	readonly slotNodes: TS.Expression[]

	private treeParsers: HTMLTreeParser[] = []
	private valueIndicesMutable: Map<number, boolean> = new Map()
	private remappedValueIndices: Map<number, number> = new Map()

	constructor(type: TemplateType, string: string, values: TS.Expression[]) {
		this.type = type
		this.slotNodes = values

		let tree = HTMLTree.fromString(string)
		this.addTreeParser(tree, null, null)
		this.checkValueIndicesMutable()
	}

	addTreeParser(tree: HTMLTree, parent: HTMLTreeParser | null, fromNode: HTMLNode | null): HTMLTreeParser {
		let parser = new HTMLTreeParser(this, tree, parent, fromNode)
		this.treeParsers.push(parser)

		return parser
	}

	/** Removes all static values and remap value indices. */
	private checkValueIndicesMutable() {
		for (let i = 0; i < this.slotNodes.length; i++) {
			let node = this.slotNodes[i]
			this.valueIndicesMutable.set(i, helper.mutable.isMutable(node))
		}
	}

	/** Returns whether the value at specified index is mutable. */
	isValueAtIndexMutable(index: number): boolean {
		return this.valueIndicesMutable.get(index)!
	}

	/** 
	 * `...${...}...` -> ${'...' + ... + '...'}
	 * Bundle a interpolation strings and value indices to a new expression.
	 * It uses `indices[0]` as new index.
	 */
	bundleValueIndices(strings: string[], valueIndices: number[]) {
		let value: TS.Expression = factory.createStringLiteral(strings[0])

		// string[0] + values[0] + strings[1] + ...
		for (let i = 1; i < strings.length; i++) {
			value = factory.createBinaryExpression(
				value,
				factory.createToken(ts.SyntaxKind.PlusToken),
				this.slotNodes[valueIndices[i - 1]]
			)

			value = factory.createBinaryExpression(
				value,
				factory.createToken(ts.SyntaxKind.PlusToken),
				factory.createStringLiteral(strings[i])
			)
		}

		this.slotNodes[valueIndices[0]] = value

		// Other values become undefined, and will be removed in the following remapping step.
		for (let i = 1; i < valueIndices.length; i++) {
			this.slotNodes[valueIndices[i]] = factory.createIdentifier('undefined')
		}

		// Mutable if any of original indices is mutable.
		this.valueIndicesMutable.set(valueIndices[0], valueIndices.some(i => this.valueIndicesMutable.get(i)))
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
		this.remapValueIndices()
	}

	/** Removes all static values and remap value indices. */
	private remapValueIndices() {
		let count = 0

		for (let i = 0; i < this.slotNodes.length; i++) {
			let node = this.slotNodes[i]

			if (!helper.mutable.isMutable(node)) {
				continue
			}

			this.remappedValueIndices.set(i, count)
			count++
		}
	}

	getRemappedValueIndex(index: number): number {
		return this.remappedValueIndices.get(index)!
	}

	private outputUpdate() {

	}
}