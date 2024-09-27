import {Helper, Scope, TemplateSlotPlaceholder} from '../../base'
import {PartPositionType} from '../../enums'
import {HTMLNode, HTMLNodeType, HTMLRoot, HTMLNodeReferences} from '../html-syntax'
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

	/** `<lu:if>`, ... */
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
 * all trees share an unique value list.
 * This parser parses one tree.
 */
export class TreeParser {

	readonly template: TemplateParser
	readonly root: HTMLRoot
	readonly parent: TreeParser | null
	readonly fromNode: HTMLNode | null
	readonly index: number
	readonly references: HTMLNodeReferences

	private wrappedBySVG: boolean = false
	private wrappedByTemplate: boolean = false
	private inSVG: boolean = false
	private outputHandler: TreeOutputHandler
	private slots: SlotParserBase[] = []
	private preDeclaredVariableNames: string[] = []

	/** Second value is whether direct child of template context. */
	private parts: [string, PartPositionType][] = []

	private refedComponentMap: Map<HTMLNode, string> = new Map()

	constructor(template: TemplateParser, root: HTMLRoot, parent: TreeParser | null, fromNode: HTMLNode | null) {
		this.template = template
		this.root = root
		this.parent = parent
		this.fromNode = fromNode
		this.index = VariableNames.getUniqueIndex('tree-index')
		this.references = new HTMLNodeReferences(this.root)

		this.initWrapping()
		this.outputHandler = new TreeOutputHandler(this, this.wrappedBySVG, this.wrappedByTemplate)
	}

	private initWrapping() {
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

		if (inSVG && this.root.firstChild?.tagName !== 'svg') {
			this.root.wrapChildrenWith('svg')
			this.wrappedBySVG = true
		}

		this.inSVG = inSVG
		this.wrappedByTemplate = this.root.firstChild?.tagName === 'template'
	}

	init() {
		this.parseSlots()
	}

	private parseSlots() {
		for (let node of this.root.walk()) {
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
					else if (tagName.startsWith('lu:')) {
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

		slot.init()
		this.slots.push(slot)
	}

	private parseSlotTag(node: HTMLNode) {
		let nameAttr = node.attrs!.find(a => a.name === 'name')
		let name = nameAttr?.value || null

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
			let valueIndices = value !== null ? TemplateSlotPlaceholder.getSlotIndices(value) : null

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
					if (valueIndices) {
						type = SlotType.Attribute
					}
			}

			if (type === null && node.tagName === 'template') {
				type = SlotType.TemplateAttribute
			}

			if (type === null) {
				continue
			}

			if (type !== SlotType.Attribute && type !== SlotType.TemplateAttribute) {
				name = name.slice(1)
			}

			this.addSlot(type, name, strings, valueIndices, node)
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

		// Joins all string parts.
		let group = this.groupTextContent(text)

		// Whole text of `...${...}...`
		if (group.length === 1 && group[0].beText) {
			let {strings, valueIndices} = group[0]

			node.desc = TemplateSlotPlaceholder.joinStringsAndValueIndices(strings, valueIndices)
			node.text = ' '
			this.addSlot(SlotType.Text, null, strings, valueIndices, node)
		}

		// `${html`...`}`
		else if (group.length === 1 && group[0].beText) {
			let {valueIndices} = group[0]

			let comment = new HTMLNode(HTMLNodeType.Comment, {})
			comment.desc = TemplateSlotPlaceholder.joinStringsAndValueIndices(null, valueIndices)
			node.replaceWith(comment)

			this.addSlot(SlotType.Content, null, null, valueIndices, comment)
		}

		// Mixture of Text, Comment, Text, Comment...
		else {
			for (let item of group) {
				let {strings, valueIndices, beText} = item

				// Text, with dynamic content.
				if (beText && valueIndices) {
					let textNode = new HTMLNode(HTMLNodeType.Text, {text: ' '})
					textNode.desc = TemplateSlotPlaceholder.joinStringsAndValueIndices(strings, valueIndices)
					node.before(textNode)

					this.addSlot(SlotType.Text, null, strings, valueIndices, textNode)
				}

				// Static text.
				else if (beText) {
					let textNode = new HTMLNode(HTMLNodeType.Text, {text: strings![0]})
					textNode.desc = strings![0]
					node.before(textNode)
				}

				// Dynamic content.
				else {
					let comment = new HTMLNode(HTMLNodeType.Comment, {})
					comment.desc = TemplateSlotPlaceholder.joinStringsAndValueIndices(null, valueIndices)
					node.before(comment)

					this.addSlot(SlotType.Content, null, null, valueIndices, comment)
				}
			}

			node.remove()
		}
	}
	
	/** Group to get bundling text part, and content part. */
	private groupTextContent(text: string) {

		interface TextContentGroupedItem {
			strings: string[] | null
			valueIndices: number[] | null
			beText: boolean | null
		}

		let strings = TemplateSlotPlaceholder.parseTemplateStrings(text)
		let valueIndices = TemplateSlotPlaceholder.getSlotIndices(text)!

		// If a value index represents a value type of node, it attracts all neighbor strings.
		let current: TextContentGroupedItem = {strings: [], valueIndices: [], beText: true}
		let group: TextContentGroupedItem[] = [current]

		if (!strings) {
			current.strings = null
			current.valueIndices = valueIndices
			current.beText = this.isValueIndexValueType(valueIndices[0])

			return group
		}

		for (let i = 0; i < strings.length; i++) {
			let string = strings[i]
			current.strings!.push(string)

			if (i === valueIndices.length) {
				break
			}

			let index = valueIndices[i]
			let beText = this.isValueIndexValueType(index)

			if (beText) {
				current.valueIndices!.push(index)
			}
			else {
				group.push({strings: null, valueIndices: [index], beText: false})
				current = {strings: [], valueIndices: [], beText: true}
				group.push(current)
			}
		}

		for (let item of group) {
			if (item.valueIndices!.length === 0) {
				item.valueIndices = null
			}
			
			if (item.strings && item.strings.length === 0) {
				item.strings = null
			}

			if (item.valueIndices === null
				&& item.strings
				&& item.strings.length > 0
				&& item.strings[0].length === 0
			) {
				item.strings = null
			}
		}

		return group.filter(item => {
			return item.strings !== null || item.valueIndices !== null
		})
	}

	/** Check whether a value index represents a value type of node. */
	private isValueIndexValueType(index: number): boolean {
		let rawNode = this.template.values.getRawValue(index)
		let type = Helper.types.getType(rawNode)

		return Helper.types.isValueType(type)
	}

	/** 
	 * Separate children of a node to an independent tree,
	 * which share an unique value list.
	 * */
	separateChildrenAsSubTree(node: HTMLNode): TreeParser {
		let root = HTMLRoot.fromSeparatingChildren(node)
		return this.template.addTreeParser(root, this, node)
	}

	

	/** Return variable name to reference current template maker, like `$template_0`. */
	getTemplateRefName(): string {
		return VariableNames.template + '_' + this.index
	}

	/** `$slot_0` */
	getUniqueSlotName(): string {
		let name = VariableNames.getDoublyUniqueName(VariableNames.slot, this)
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
	addPart(name: string, node: HTMLNode) {
		let positionType = this.getPartPositionType(node)
		this.parts.push([name, positionType])
	}

	/** Whether be the direct child of template content. */
	private getPartPositionType(node: HTMLNode): PartPositionType {
		let parent = node.parent!

		if (this.wrappedByTemplate && parent.tagName === 'root') {
			return PartPositionType.ContextNode
		}
		else if (this.wrappedByTemplate || this.wrappedBySVG) {
			if (parent.parent && parent.parent.tagName === 'root') {
				return PartPositionType.DirectNode
			}
			else {
				return PartPositionType.Others
			}
		}
		else {
			if (parent.tagName === 'root') {
				return PartPositionType.DirectNode
			}
			else {
				return PartPositionType.Others
			}
		}
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

		// For dynamic component, uses a slot to reference component as part.
		if (!TemplateSlotPlaceholder.isDynamicComponent(node.tagName!)) {
			this.addPart(comName, node)
		}

		return comName
	}

	/** Get component name of a refed component by it's node. */
	getRefedComponentName(node: HTMLNode): string {
		return this.refedComponentMap.get(node)!
	}

	/** Output contents and interpolate. */
	output(scope: Scope) {
		this.outputHandler.output(
			this.slots,
			this.preDeclaredVariableNames,
			this.parts,
			scope
		)
	}
}

