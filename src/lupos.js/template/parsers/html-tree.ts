import {helper, TemplateSlotPlaceholder} from '../../../base'
import {HTMLNode, HTMLNodeType, HTMLTree} from '../html-syntax'
import {TemplateParser} from './template'


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
	nodeIndex: number | null

	/** If slot uses another tree as it's content. */
	treeIndex: number | null
}

/** Type of each template slot. */
export enum SlotType {

	/** `>${...}<`, content, normally a template result, or a list of template result, or null. */
	Content,

	/** Pure text node. */
	Text,

	/** `<slot>` */
	SlotTag,

	/** `<${} ...>` */
	DynamicComponent,

	/** `<tag attr=...>` */
	Attr,

	/** `<tag .property=...>` */
	Property,

	/** `<tag @event=...>` */
	Event,

	/** `<tag :class=...>` */
	Binging,
}


/** Parse a html tree of a template. */
export class HTMLTreeParser {

	static indexSeed: number = -1

	static initialize() {
		this.indexSeed = -1
	}


	readonly template: TemplateParser
	readonly tree: HTMLTree
	readonly parent: HTMLTreeParser | null
	readonly fromNode: HTMLNode | null
	readonly index: number

	inSVG: boolean = false
	wrappedBySVG: boolean = false

	private slots: Slot[] = []

	constructor(template: TemplateParser, tree: HTMLTree, parent: HTMLTreeParser | null, fromNode: HTMLNode | null) {
		this.template = template
		this.tree = tree
		this.parent = parent
		this.fromNode = fromNode
		this.index = ++HTMLTreeParser.indexSeed

		this.initSVGWrapping()
		this.parseSlots()
	}
	
	private initSVGWrapping() {
		let inSVG = false

		if (this.template.type === 'svg') {
			inSVG = true
		}
		else if (this.parent && this.parent.inSVG) {
			inSVG = true
		}
		else if (this.fromNode && this.fromNode.closest('svg')) {
			inSVG = true
		}

		if (inSVG && this.tree.firstChild?.tagName !== 'svg') {
			this.tree.firstChild!.wrapWith('svg')
			this.wrappedBySVG = true
		}

		this.inSVG = inSVG
	}

	private parseSlots() {
		for (let node of this.tree.walk()) {
			switch (node.type) {
				case HTMLNodeType.Tag:
					let tagName = node.tagName!

					if (tagName === 'slot') {
						this.parseSlotTag(node)
					}
					else if (TemplateSlotPlaceholder.isCompleteSlotIndex(tagName)) {
						this.parseDynamicTagName(node)
						break
					}
					else if (tagName.startsWith('lupos:')) {
						this.parseDynamicTagName(node)
						break
					}

					this.parseAttributes(node)
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
		let nameAttr = node.attrs!.find(a => a.name === 'name')
		let name = nameAttr?.name || null
		let parser: HTMLTreeParser | null = null

		// Slot default content.
		if (node.children.length > 0) {
			parser = this.separateSubTree(node)
		}

		this.slots.push({
			type: SlotType.SlotTag,
			name,
			strings: null,
			valueIndices: null,
			nodeIndex: this.tree.references.reference(node),
			treeIndex: parser ? parser.index : null,
		})
	}

	private separateSubTree(node: HTMLNode): HTMLTreeParser {
		let tree = node.separateChildren()
		return this.template.addTreeParser(tree, this, node)
	}

	private parseDynamicTagName(node: HTMLNode) {
		let nameAttr = node.attrs!.find(a => a.name === 'name')
		let name = nameAttr?.name || null

		this.slots.push({
			type: SlotType.DynamicComponent,
			name,
			strings: null,
			valueIndices: [TemplateSlotPlaceholder.getUniqueSlotIndex(node.tagName!)!],
			nodeIndex: this.tree.references.reference(node),
			treeIndex: null,
		})
	}

	private parseAttributes(node: HTMLNode) {
		for (let attr of node.attrs!) {
			let {name, value} = attr
			
			// `<tag ...=${...}>
			// `<tag ...="...${...}...">
			let type: SlotType | undefined
			let slotIndices = value ? TemplateSlotPlaceholder.getSlotIndices(value) : []
			let strings = value !== null ? TemplateSlotPlaceholder.parseTemplateStrings(value) : null

			switch (name[0]) {
				case '.':
					type = SlotType.Property
					break

				case ':':
					type = SlotType.Binging
					break

				case '@':
					type = SlotType.Event
					break

				default:
					type = SlotType.Attr
			}

			if (type !== undefined) {
				name = name.slice(1)
			}

			if (slotIndices.length > 0) {
				this.slots.push({
					type,
					name,
					strings: null,
					valueIndices: slotIndices,
					nodeIndex: this.tree.references.reference(node),
					treeIndex: null,
				})

				node.removeAttr(attr)
			}

			// `.a="b"`
			else if (type !== SlotType.Attr) {
				this.slots.push({
					type,
					name,
					strings,
					valueIndices: null,
					nodeIndex: this.tree.references.reference(node),
					treeIndex: null,
				})

				node.removeAttr(attr)
			}
		}
	}

	/** Parses `<tag>${...}</tag>`. */
	private parseText(node: HTMLNode) {

		// Note `text` has been trimmed when parsing tokens.
		let text = node.text!
		if (!TemplateSlotPlaceholder.hasSlotIndex(text)) {
			return
		}

		let strings = TemplateSlotPlaceholder.parseTemplateStrings(text)
		let slotIndices = TemplateSlotPlaceholder.getSlotIndices(text)
		let joinAsAWholeText = false

		// `>{textValue}<` or
		// `>${html`...`}<`
		if (slotIndices.length > 0) {
			joinAsAWholeText = slotIndices.every(index => {
				return helper.types.isValueType(helper.types.getType(this.template.values[index]))
			})
		}

		// Text `...${...}...`
		if (joinAsAWholeText) {
			this.slots.push({
				type: SlotType.Text,
				name: null,
				strings,
				valueIndices: slotIndices,
				nodeIndex: this.tree.references.reference(node),
				treeIndex: null,
			})
		}

		// Text, Comment, Text, Comment...
		else if (strings) {

			let mixedNodes: HTMLNode[] = []

			for (let i = 0; i < strings.length; i++) {
				let string = strings[i]
				if (string) {
					mixedNodes.push(new HTMLNode(HTMLNodeType.Text, {text: string}))
				}

				if (i < slotIndices.length) {
					let comment = new HTMLNode(HTMLNodeType.Comment, {})

					this.slots.push({
						type: SlotType.Content,
						name: null,
						strings: null,
						valueIndices: [slotIndices[i]],
						nodeIndex: this.tree.references.reference(comment),
						treeIndex: null,
					})

					mixedNodes.push(comment)
				}
			}

			node.replaceWith(...mixedNodes)
		}

		return text
	}
}

