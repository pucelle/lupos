import {Helper, TemplateSlotPlaceholder} from '../../../base'
import {HTMLNode, HTMLNodeType, HTMLTree, HTMLNodeReferences} from '../html-syntax'
import {SlotParserBase, DynamicComponentSlotParser, FlowControlSlotParser, PropertySlotParser, BindingSlotParser, EventSlotParser, AttributeSlotParser, TextSlotParser, ContentSlotParser, ComponentSlotParser, SlotTagSlotParser, TemplateAttributeSlotParser} from './slots'
import {TemplateParser} from './template'
import {TreeOutputHandler} from './tree-output'
import {VariableNames} from './variable-names'


/** Type of each template slot. */
enum SlotType {

	/** `>${...}<`, content, normally a template result, or a list of template result, or null. */
	Content,

	/** Pure text node. */
	Text,

	/** `<slot>` */
	SlotTag,

	/** `<Component>` */
	Component,

	/** `<${} ...>` */
	DynamicComponent,

	/** `<lupos:if>`, ... */
	FlowControl,

	/** `<tag attr=...>` */
	Attribute,

	/** `<template attr="">` */
	TemplateAttribute,

	/** `<tag .property=...>` */
	Property,

	/** `<tag @event=...>` */
	Event,

	/** `<tag :class=...>` */
	Binding,
}


/** 
 * One template may be separated to several trees,
 * This parser parses one tree. */
export class TreeParser {

	readonly template: TemplateParser
	readonly tree: HTMLTree
	readonly parent: TreeParser | null
	readonly fromNode: HTMLNode | null
	readonly index: number
	readonly references: HTMLNodeReferences

	private wrappedBySVG: boolean = false
	private inSVG: boolean = false
	private outputHandler: TreeOutputHandler
	private slots: SlotParserBase[] = []
	private preDeclaredVariableNames: string[] = []
	private partNames: string[] = []
	private refedComponentMap: Map<HTMLNode, string> = new Map()
	private hasDynamicComponent: boolean = false

	constructor(template: TemplateParser, tree: HTMLTree, parent: TreeParser | null, fromNode: HTMLNode | null) {
		this.template = template
		this.tree = tree
		this.parent = parent
		this.fromNode = fromNode
		this.index = VariableNames.getUniqueIndex('tree-index')
		this.references = new HTMLNodeReferences(this.tree)

		this.initSVGWrapping()
		this.outputHandler = new TreeOutputHandler(this, this.wrappedBySVG)
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

	init() {
		this.parseSlots()

		for (let slot of this.slots) {
			slot.init()
		}
	}

	private parseSlots() {
		for (let node of this.tree.walk()) {
			switch (node.type) {
				case HTMLNodeType.Tag:
					let tagName = node.tagName!

					if (tagName === 'slot') {
						this.parseSlotTag(node)
					}
					else if (TemplateSlotPlaceholder.isNamedComponent(tagName)) {
						this.parseComponentTag(node)
					}
					else if (TemplateSlotPlaceholder.isDynamicComponent(tagName)) {
						this.parseDynamicTag(node)
					}
					else if (tagName.startsWith('lupos:')) {
						this.parseFlowControlTag(node)
					}

					this.parseAttributes(node)
					break

				case HTMLNodeType.Text:
					this.parseText(node)
					break
			}
		}
	}

	/** Note `node` may not in tree when adding the slot. */
	private addSlot(
		type: SlotType,
		name: string | null,
		strings: string[] | null,
		valueIndices: number[] | null,
		node: HTMLNode
	) {
		let slot: SlotParserBase
		
		switch (type) {
			case SlotType.SlotTag:
				slot = new SlotTagSlotParser(name, strings, valueIndices, node, this)
				break

			case SlotType.Component:
				slot = new ComponentSlotParser(name, strings, valueIndices, node, this)
				break

			case SlotType.DynamicComponent:
				this.hasDynamicComponent = true
				slot = new DynamicComponentSlotParser(name, strings, valueIndices, node, this)
				break

			case SlotType.FlowControl:
				slot = new FlowControlSlotParser(name, strings, valueIndices, node, this)
				break

			case SlotType.Property:
				slot = new PropertySlotParser(name, strings, valueIndices, node, this)
				break

			case SlotType.Binding:
				slot = new BindingSlotParser(name, strings, valueIndices, node, this)
				break

			case SlotType.Event:
				slot = new EventSlotParser(name, strings, valueIndices, node, this)
				break

			case SlotType.Attribute:
				slot = new AttributeSlotParser(name, strings, valueIndices, node, this)
				break

			case SlotType.TemplateAttribute:
				slot = new TemplateAttributeSlotParser(name, strings, valueIndices, node, this)
				break

			case SlotType.Text:
				slot = new TextSlotParser(name, strings, valueIndices, node, this)
				break

			case SlotType.Content:
				slot = new ContentSlotParser(name, strings, valueIndices, node, this)
				break
		}

		this.slots.push(slot)
	}

	private parseSlotTag(node: HTMLNode) {
		let nameAttr = node.attrs!.find(a => a.name === 'name')
		let name = nameAttr?.name || null

		this.addSlot(SlotType.SlotTag, name, null, null, node)
	}

	private parseComponentTag(node: HTMLNode) {
		this.addSlot(SlotType.Component, null, null, null, node)
	}

	private parseDynamicTag(node: HTMLNode) {
		let valueIndices = TemplateSlotPlaceholder.getSlotIndices(node.tagName!)
		this.addSlot(SlotType.DynamicComponent, null, null, valueIndices, node)
	}

	private parseFlowControlTag(node: HTMLNode) {
		this.addSlot(SlotType.FlowControl, null, null, null, node)
	}

	private parseAttributes(node: HTMLNode) {
		for (let attr of [...node.attrs!]) {
			let {name, value, quoted} = attr
			let type: SlotType | null = null

			// `<tag ...=${...}>
			// `<tag ...="...${...}...">
			let strings = value !== null ? TemplateSlotPlaceholder.parseTemplateStrings(value, quoted) : null
			let slotIndices = value !== null ? TemplateSlotPlaceholder.getSlotIndices(value) : null

			switch (name[0]) {
				case '.':
					type = SlotType.Property
					break

				case ':':
					type = SlotType.Binding
					break

				case '@':
					type = SlotType.Event
					break

				default:
					if (slotIndices) {
						type = SlotType.Attribute
					}
			}

			if (type === null && node.tagName === 'template') {
				type = SlotType.TemplateAttribute
			}

			if (type === null) {
				continue
			}

			if (type !== SlotType.Attribute) {
				name = name.slice(1)
			}

			this.addSlot(type, name, strings, slotIndices, node)
			node.removeAttr(attr)
		}
	}

	/** Parse `<tag>${...}</tag>`. */
	private parseText(node: HTMLNode) {

		// Note `text` has been trimmed when parsing tokens.
		let text = node.text!
		if (!TemplateSlotPlaceholder.hasSlotIndex(text)) {
			return
		}

		let strings = TemplateSlotPlaceholder.parseTemplateStrings(text)
		let slotIndices = TemplateSlotPlaceholder.getSlotIndices(text)!

		// `>{textValue}<` or
		// `>${html`...`}<`
		let joinAsAWholeText = slotIndices.every(index => {
			return Helper.types.isValueType(Helper.types.getType(this.template.values.getRawNode(index)))
		})

		// Whole text of `...${...}...`
		if (joinAsAWholeText) {
			this.addSlot(SlotType.Text, null, strings, slotIndices, node)
			node.text = ' '
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
					mixedNodes.push(comment)

					this.addSlot(SlotType.Content, null, null, [slotIndices[i]], comment)
				}
			}

			node.replaceWith(...mixedNodes)
		}

		// A single content.
		else {
			let comment = new HTMLNode(HTMLNodeType.Comment, {})
			this.addSlot(SlotType.Content, null, null, slotIndices, comment)
			node.replaceWith(comment)
		}

		return text
	}

	/** Separate children of a node to an independent tree. */
	separateChildrenAsSubTree(node: HTMLNode): TreeParser {
		let tree = HTMLTree.fromSeparatingChildren(node)
		return this.template.addTreeParser(tree, this, node)
	}

	/** Return variable name to reference current template maker, like `$template_0`. */
	getTemplateRefName(): string {
		return VariableNames.template + '_' + this.index
	}

	/** `$slot_0` */
	getUniqueSlotName(): string {
		let name = VariableNames.getDoublyUniqueName(VariableNames.slot, this)
		this.addPartName(name)
		return name
	}

	/** `$binding_0` */
	getUniqueBindingName(): string {

		// Only partial binding classes are parts.
		let name = VariableNames.getDoublyUniqueName(VariableNames.binding, this)
		return name
	}

	/** `$block_0` */
	getUniqueBlockName(): string {
		let name = VariableNames.getDoublyUniqueName(VariableNames.block, this)
		return name
	}

	/** `$latest_0` */
	getUniqueLatestName(): string {
		let name = VariableNames.getDoublyUniqueName(VariableNames.latest, this)
		this.addPreDeclaredVariableName(name)
		return name
	}

	/** Add a variable name to `parts`. */
	addPartName(name: string) {
		this.partNames.push(name)
	}

	/** Add a variable name to `let ..., ...` list. */
	addPreDeclaredVariableName(name: string) {
		this.preDeclaredVariableNames.push(name)
	}

	/** 
	 * Reference component of a node and get it's unique variable name.
	 * Must call it in `init` method.
	 */
	refAsComponent(node: HTMLNode): string {
		if (this.refedComponentMap.has(node)) {
			return this.refedComponentMap.get(node)!
		}

		let comName = VariableNames.getDoublyUniqueName(VariableNames.com, this)
		this.refedComponentMap.set(node, comName)
		this.partNames.push(comName)

		return comName
	}

	/** Get component name of a refed component by it's node. */
	getRefedComponentName(node: HTMLNode): string {
		return this.refedComponentMap.get(node)!
	}

	/** Output contents and interpolate. */
	output() {
		this.outputHandler.output(
			this.slots,
			this.preDeclaredVariableNames,
			this.partNames,
			this.hasDynamicComponent
		)
	}
}

