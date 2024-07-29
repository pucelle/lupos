import type TS from 'typescript'
import {containsOrderMarker, parseOrderMarkers, splitByOrderMarkers} from '../html-syntax/template'
import {HTMLNode, HTMLNodeType, HTMLTree} from '../html-syntax/html-node'
import {TemplateSlotPlaceholder} from '../../../base'


export type TemplateType = 'html' | 'svg'

/** Each template slot represent a `${...}`. */
export interface Slot {

	/** Slot type. */
	type: SlotType

	/** Slot attribute name, be `null` for dynamic binding `<tag ${...}>`. */
	name: string | null

	/** If defined as `???="a${...}b"`, be `[a, b]`. Otherwise be `null`. */
	strings: string[] | null

	/** 
	 * Value indices in the whole template.
	 * Having more than one values for `???="a${...}b${...}c"`.
	 * Is `null` if slot is a fixed slot defined like `???="..."`.
	 */
	valueIndices: number[] | null

	/** Index of the node the slot placed at within the document fragment. */
	nodeIndex: number
}

/** Type of each template slot. */
export enum SlotType {

	/** `>${...}<`, either tag or text. */
	Content,

	/** `<slot>` */
	SlotTag,

	/** `<${} ...>` */
	DynamicComponent,

	/** `<tag attr=...>` */
	Attr,

	/** `<tag ?attr=...>` */
	QueryAttr,

	/** `<tag .property=...>` */
	Property,

	/** `<tag @event=...>` */
	Event,

	/** `<tag :class=...>` */
	Binging,
}


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

	static treeSeed: number = -1

	static initialize() {
		this.treeSeed = -1
	}

	readonly type: TemplateType
	readonly values: TS.Expression[]
	private mainTree: HTMLTree
	private trees: {tree: HTMLTree, index: number, wrappedBySVG: boolean}[] = []
	private wrappedBySVG: boolean = false
	private slots: Slot[] = []

	constructor(type: TemplateType, string: string, values: TS.Expression[]) {
		this.type = type
		this.values = values
		this.mainTree = HTMLTree.fromString(string)

		this.parseTree(this.mainTree)
	}

	private parseTree(tree: HTMLTree, parent: HTMLTree) {
		this.initTreeWrapping(tree)
		this.parseSlots(tree)

		this.trees.push({
			tree,
			index: ++TemplateParser.treeSeed,
			wrappedBySVG: parent.
		})
	}

	private initTreeWrapping(tree: HTMLTree) {
		if (this.type === 'svg' && tree.firstChild?.token.tagName !== 'svg') {
			tree.firstChild!.wrapWith('svg')
			this.wrappedBySVG = true
		}
	}

	private parseSlots(tree: HTMLTree) {
		for (let node of tree.walk()) {
			switch (node.type) {
				case HTMLNodeType.Tag:
					let tagName = node.token.tagName!

					if (tagName === 'slot') {
						this.parseSlotTag(node)
					}
					else if (TemplateSlotPlaceholder.isCompleteSlotIndex(tagName)) {
						this.parseDynamicTagName(node)
						break
					}

					this.parseAttribute(node)
					break

				case HTMLNodeType.Text:
					this.parseText(node)
					break
			}
		}

		let template = createTemplateFromHTML(codes)
		let attributes: {name: string, value: string}[] | null = null

		if (svgWrapped) {
			let svg = template.content.firstElementChild!
			template.content.append(...svg.childNodes)
			svg.remove()
		}

		// We can define some classes or styles on the top element if renders `<template class="...">`.
		if (firstTag && firstTag.tagName === 'template') {
			template = template.content.firstElementChild as HTMLTemplateElement
			attributes = [...template.attributes].map(({name, value}) => ({name, value}))
		}
	}

	private parseSlotTag(node: HTMLNode) {
		let nameAttr = node.token.attrs!.find(a => a.name === 'name')
		let name = nameAttr?.name || null

		this.slots.push({
			type: SlotType.SlotTag,
			name,
			strings: null,
			valueIndices: null,
			nodeIndex: this.mainTree.references.reference(node),
		})

		if (node.children.length > 0) {
			this.separateSubTree(node)
		}
	}

	private separateSubTree(node: HTMLNode) {
		let tree = node.separateChildren()
		this.parseTree(tree)
	}

	private parseDynamicTagName(node: HTMLNode) {
		let nameAttr = node.token.attrs!.find(a => a.name === 'name')
		let name = nameAttr?.name || null

		this.slots.push({
			type: SlotType.SlotTag,
			name,
			strings: null,
			valueIndices: null,
			nodeIndex: this.mainTree.references.reference(node),
		})
	}

	private parseAttribute(node: HTMLNode) {
		for (let attr of node.token.attrs!) {

			// `<tag ${...}>`
			if (isCompleteSlotIndex(attr.name)) {
				this.slots.push({
					type: SlotType.DynamicBinding,
					name: null,
					strings: null,
					valueIndices: [Number(markerId)],
					nodeIndex: this.currentNodeIndex,
				})

				continue
			}

			// `<tag ...=${...}>
			// `<tag ...=...>
			let type: SlotType | undefined
			let hasMarker = containsOrderMarker(value)

			switch (name[0]) {
				case '.':
					type = SlotType.Property
					break

				case ':':
					type = SlotType.FixedBinging
					break

				case '?':
					type = SlotType.MayAttr
					break

				case '@':
					type = SlotType.Event
					break
			}

			if (type !== undefined) {
				name = name.slice(1)
			}

			if (type === undefined && hasMarker) {
				// `class=${...}` -> `:class=${...}`, so the class value can be scoped.
				if (name === 'class') {
					type = SlotType.FixedBinging
				}
				else {
					type = SlotType.Attr
				}
			}

			if (type !== undefined) {
				if (value[0] === '\'' || value[0] === '"') {
					value = value.slice(1, -1)
				}

				if (hasMarker) {
					let {strings, valueIndices} = parseOrderMarkers(value)
					this.slots.push({
						type,
						name,
						strings,
						valueIndices,
						nodeIndex: this.currentNodeIndex,
					})
				}
				else {
					this.slots.push({
						type,
						name,
						strings: [value],
						valueIndices: null,
						nodeIndex: this.currentNodeIndex,
					})
				}

				if (type === SlotType.Attr) {
					return name + '="" '
				}
				else {
					return ''
				}
			}
			else if (name === 'class' && this.scopedClassNameSet) {
				value = value.replace(/[\w-]+/g, (m0: string) => {
					if (this.scopedClassNameSet!.has(m0)) {
						return m0 + '__' + this.scopeName
					}
					else {
						return m0
					}
				})

				return name + '=' + value
			}
			
			return m0
		}
	}

	/** Parses `<tag>${...}</tag>`. */
	private parseText(text: string): string {
		// `text` has already been trimmed here when parsing as tokens.

		if (containsOrderMarker(text)) {
			let {strings, valueIndices} = splitByOrderMarkers(text)

			// Hole may include a `TemplateResult`, so must process each seperately, can't join them to a string.
			for (let i = 1; i < strings.length; i++) {
				this.slots.push({
					type: SlotType.Node,
					name: null,
					strings: null,
					valueIndices: valueIndices.slice(i - 1, i),
					nodeIndex: this.currentNodeIndex,
				})

				this.currentNodeIndex += 1
			}

			text = strings.map(trim).join('<!--->')
		}

		return text
	}

	/** Clean properties for next time parsing. */
	private clean() {
		this.slots = []
		this.currentNodeIndex = 0
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