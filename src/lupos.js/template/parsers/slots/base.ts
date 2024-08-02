import type TS from 'typescript'
import {HTMLNode} from '../../html-syntax'
import {HTMLTreeParser} from '../html-tree'
import {factory} from '../../../../base'
import {VariableNames} from '../variable-names'


export abstract class SlotBase {

	/** Attribute name, be `null` for dynamic binding `<tag ${...}>`. */
	readonly name: string | null = null

	/** Modifiers. */
	readonly modifiers: string[] | null = []

	/** If defined as `???="..."`, be `...`. Otherwise be `null`. */
	readonly string: string | null

	/** 
	 * Value index in the whole template.
	 * Is `null` if slot is a fixed slot defined like `???="..."`.
	 */
	readonly valueIndex: number | null

	/** Index of the node the slot placed at within the document fragment. */
	readonly node: HTMLNode

	/** Tree current slot belonged to. */
	readonly tree: HTMLTreeParser

	constructor(
		name: string | null,
		string: string | null,
		valueIndex: number | null,
		node: HTMLNode,
		tree: HTMLTreeParser
	) {
		this.name = name
		this.string = string
		this.valueIndex = valueIndex

		if (name !== null) {
			let splitted = name.split(/[^\w]/g)
			this.name = splitted[0]
			this.modifiers = splitted.slice(1)
		}

		this.node = node
		this.tree = tree

		this.init()
	}

	/** Get value node, either `$values[0]`, or `"..."`. */
	protected getOutputValueNode(): TS.Expression {
		if (this.valueIndex === null) {
			return factory.createStringLiteral(this.string!)
		}
		else {
			return factory.createElementAccessExpression(
				factory.createIdentifier(VariableNames.values),
				factory.createNumericLiteral(this.valueIndex!)
			)
		}
	}

	/** Initialize and prepare. */
	protected init() {}

	/** 
	 * Output initialize codes.
	 * Note it should not output variable declaration codes,
	 * which will be output by tree parser.
	 */
	outputInit(): TS.Statement| TS.Expression | (TS.Statement| TS.Expression)[] {
		return []
	}

	/** Output update codes. */
	outputUpdate(): TS.Statement| TS.Expression | (TS.Statement| TS.Expression)[] {
		return []
	}
}