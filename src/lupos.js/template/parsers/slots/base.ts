import type TS from 'typescript'
import {HTMLNode} from '../../html-syntax'
import {HTMLTreeParser} from '../html-tree'

/** Type of each template slot. */
export enum SlotType {

	/** `>${...}<`, content, normally a template result, or a list of template result, or null. */
	Content,

	/** Pure text node. */
	Text,

	/** `<slot>` */
	SlotTag,

	/** `<${} ...>` */
	DynamicTag,

	/** `<lupos:if>`, ... */
	FlowControlTag,

	/** `<tag attr=...>` */
	Attr,

	/** `<tag .property=...>` */
	Property,

	/** `<tag @event=...>` */
	Event,

	/** `<tag :class=...>` */
	Binding,
}


export abstract class SlotBase {

	/** Slot type. */
	readonly type: SlotType

	/** Attribute name, be `null` for dynamic binding `<tag ${...}>`. */
	readonly name: string | null

	/** If defined as `???="a${...}b"`, be `[a, b]`. Otherwise be `null`. */
	readonly strings: string[] | null

	/** 
	 * Value indices in the whole template.
	 * Having more than one values for `???="a${...}b${...}c"`.
	 * Is `null` if slot is a fixed slot defined like `???="..."`.
	 */
	readonly valueIndices: number[] | null

	/** Index of the node the slot placed at within the document fragment. */
	readonly node: HTMLNode

	/** Tree belonged to . */
	readonly tree: HTMLTreeParser

	constructor(
		type: SlotType,
		name: string | null,
		strings: string[] | null,
		valueIndices: number[] | null,
		node: HTMLNode,
		tree: HTMLTreeParser
	) {
		this.type = type
		this.name = name
		this.strings = strings
		this.valueIndices = valueIndices
		this.name = name
		this.node = node
		this.tree = tree
	}

	abstract parse(): void

	/** 
	 * Output initialize codes.
	 * Note it should not output variable declaration codes,
	 * which will be output by tree parser.
	 */
	outputInit(): TS.Statement[] {
		return []
	}

	/** Output update codes. */
	outputUpdate(): TS.Statement[] {
		return []
	}
}