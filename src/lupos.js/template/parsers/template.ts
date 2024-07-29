import type TS from 'typescript'
import {HTMLNode, HTMLNodeType, HTMLTree} from '../html-syntax'
import {TemplateSlotPlaceholder} from '../../../base'
import {HTMLTreeParser} from './html-tree'


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
	readonly values: TS.Expression[]

	private treeParsers: HTMLTreeParser[] = []

	constructor(type: TemplateType, string: string, values: TS.Expression[]) {
		this.type = type
		this.values = values

		let tree = HTMLTree.fromString(string)
		this.addTreeParser(tree, null, null)
	}

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
}