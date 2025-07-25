import {DeclarationScope, helper} from '../../core'
import {PartPositionType} from '../../enums'
import {HTMLNodeHelper, HTMLNodeReferences} from '../html-syntax'
import {HTMLNode, HTMLNodeType, HTMLRoot, TemplatePartParser, TemplatePart, TemplatePartType, TemplateSlotPlaceholder} from '../../lupos-ts-module'
import {SlotParserBase, DynamicComponentSlotParser, FlowControlSlotParser, PropertySlotParser, BindingSlotParser, EventSlotParser, AttributeSlotParser, TextSlotParser, ContentSlotParser, ComponentSlotParser, SlotTagSlotParser} from './slots'
import {TemplateParser} from './template'
import {TreeOutputHandler} from './tree-output'
import {VariableNames} from './variable-names'


/** Parts can be connected or disconnected. */
export interface Part {
	type: PartType
	name: string
	position: PartPositionType
	node: HTMLNode
}

/** 
 * Type of part.
 * `Binding` must in the preceding of `Component`.
 */
export enum PartType {
	Binding,
	Component,
	Delegator,
	Slot,
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
	private templateParts: TemplatePart[] = []
	private slotParsers: SlotParserBase[] = []
	private preDeclaredVariableNames: string[] = []

	/** All parts included. */
	private parts: Part[] = []

	/** Node referenced component name. */
	private refedComponentMap: Map<HTMLNode, string> = new Map()

	private determined: boolean = false

	constructor(
		template: TemplateParser,
		root: HTMLRoot,
		parent: TreeParser | null,
		fromNode: HTMLNode | null
	) {
		this.template = template
		this.root = root
		this.parent = parent
		this.fromNode = fromNode
		this.index = VariableNames.getUniqueIndex('tree-index')
		this.references = new HTMLNodeReferences(this.root)

		this.initWrapping()
		this.outputHandler = new TreeOutputHandler(this, this.index, this.wrappedBySVG, this.wrappedByTemplate)
	}

	private initWrapping() {
		let inSVG = false

		if (this.template.tagName === 'svg') {
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

	/** Parse after initialized all the things. */
	parse() {
		let canModify = true
		let partParser = new TemplatePartParser(this.root, this.template.values.valueNodes, canModify, this.onTemplatePart.bind(this), helper)
		partParser.parse()

		// Must after nodes parsed.
		// Nodes will be adjusted when parsing.
		// If insert nodes earlier, may affect
		// this step, especially text parsing.
		this.prepareSlotPositionNode()
	}

	/** 
	 * Note `node` may not in tree when adding the slot.
	 * It returns a callback to do more init after all children initialized.
	 */
	private onTemplatePart(part: TemplatePart) {
		let parser: SlotParserBase | null = null

		switch (part.type) {
			case TemplatePartType.SlotTag:
				parser = new SlotTagSlotParser(part, this)
				break

			case TemplatePartType.Component:
				parser = new ComponentSlotParser(part, this)
				break

			case TemplatePartType.DynamicComponent:
				parser = new DynamicComponentSlotParser(part, this)
				break

			case TemplatePartType.FlowControl:
				parser = new FlowControlSlotParser(part, this)
				break

			case TemplatePartType.Property:
				parser = new PropertySlotParser(part, this)
				break

			case TemplatePartType.Binding:
				parser = new BindingSlotParser(part, this)
				break

			case TemplatePartType.Event:
				parser = new EventSlotParser(part, this)
				break

			case TemplatePartType.SlottedAttribute:
			case TemplatePartType.QueryAttribute:
				parser = new AttributeSlotParser(part, this)
				break

			case TemplatePartType.SlottedText:
				parser = new TextSlotParser(part, this)
				break

			case TemplatePartType.Content:
				parser = new ContentSlotParser(part, this)
				break
		}

		if (!parser) {
			return undefined
		}

		parser.preInit()

		this.templateParts.push(part)
		this.slotParsers.push(parser)
		this.references.ref(part.node)

		return () => {
			parser.postInit()
		}
	}

	/** Prepare node for `new SlotPosition(...)` to indicate the start inner position of template. */
	private prepareSlotPositionNode() {
		let container = this.root
		let firstNode: HTMLNode | null = container.firstChild!

		// Being wrapped.
		if (this.wrappedBySVG || this.wrappedByTemplate) {
			container = container.firstChild!
			firstNode = firstNode.firstChild!
		}

		// Skip all sibling nodes that will be removed.
		// Reset to null if still not stable.
		if (firstNode) {
			firstNode = HTMLNodeHelper.findNextStableNode(firstNode, this.template.values.valueNodes)
		}

		// Insert a comment at start as start inner position.
		if (!firstNode) {
			firstNode = new HTMLNode(HTMLNodeType.Comment, -1, -1)
			container.prepend(firstNode)
		}

		// Make it to be referenced.
		this.references.ref(firstNode)
	}

	/** 
	 * Separate children of a node to an independent tree,
	 * which share an unique value list.
	 * */
	separateChildrenAsSubTree(node: HTMLNode): TreeParser {
		let root = HTMLRoot.fromSeparatingChildren(node)
		let tree = this.template.addTreeParser(root, this, node)
		tree.parse()

		return tree
	}
	

	/** Return variable name to reference current template maker, like `$template_0`. */
	makeTemplateRefName(): string {
		return VariableNames.buildName(VariableNames.template, this.index)
	}

	/** `$slot_0` */
	makeUniqueSlotName(): string {
		let name = VariableNames.getDoublyUniqueName(VariableNames.slot, this)
		return name
	}

	/** `$binding_0` */
	makeUniqueBindingName(): string {

		// Only partial binding classes are parts.
		let name = VariableNames.getDoublyUniqueName(VariableNames.binding, this)
		return name
	}

	/** `$delegator_0` */
	makeUniqueDelegatorName(): string {
		let name = VariableNames.getDoublyUniqueName(VariableNames.delegator, this)
		return name
	}

	/** `$block_0` */
	makeUniqueBlockName(): string {
		let name = VariableNames.getDoublyUniqueName(VariableNames.block, this)
		return name
	}

	/** `$latest_0` */
	makeUniqueLatestName(): string {
		let name = VariableNames.getDoublyUniqueName(VariableNames.latest, this)
		this.addPreDeclaredVariableName(name)
		return name
	}

	/** Add a variable name to `parts`. */
	addPart(name: string, node: HTMLNode, type: PartType) {
		let position = this.getPartPositionType(node)

		this.parts.push({
			type,
			name,
			position,
			node,
		})
	}

	/** Whether be the direct child of template content. */
	private getPartPositionType(node: HTMLNode): PartPositionType {
		let parent = node.parent!

		if (this.wrappedByTemplate && parent === this.root) {
			return PartPositionType.ContextNode
		}
		else if (this.wrappedByTemplate || this.wrappedBySVG) {
			if (parent.parent === this.root) {
				return PartPositionType.DirectNode
			}
			else {
				return PartPositionType.Normal
			}
		}
		else {
			if (parent === this.root) {
				return PartPositionType.DirectNode
			}
			else {
				return PartPositionType.Normal
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
		if (this.determined) {
			throw new Error(`References have been determined!`)
		}

		if (this.refedComponentMap.has(node)) {
			return this.refedComponentMap.get(node)!
		}

		let comName = VariableNames.getDoublyUniqueName(VariableNames.com, this)
		this.refedComponentMap.set(node, comName)

		// For dynamic component, uses a slot to reference component as part.
		if (!TemplateSlotPlaceholder.isDynamicComponent(node.tagName!)) {
			this.addPart(comName, node, PartType.Component)
		}

		return comName
	}

	/** Get component name of a refed component by it's node. */
	getRefedComponentName(node: HTMLNode): string | undefined {
		if (!this.determined) {
			throw new Error(`References have not been determined!`)
		}

		return this.refedComponentMap.get(node)
	}

	/** 
	 * Prepare to output whole tree as expressions,
	 * Return a callback, call which will finally interpolate to source file.
	 */
	prepareToOutput(scope: DeclarationScope): () => void {
		this.determined = true
		this.references.determine()

		let parts = this.parts
		parts.sort((a, b) => {
			if (a.node !== b.node) {
				return 0
			}

			return a.type - b.type
		})

		return this.outputHandler.prepareToOutput(
			this.slotParsers,
			this.preDeclaredVariableNames,
			parts,
			scope
		)
	}
}

