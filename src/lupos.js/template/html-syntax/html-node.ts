import {TemplateSlotPlaceholder} from '../../../base'
import {removeFromList} from '../../../utils'
import {HTMLAttribute, HTMLToken, HTMLTokenParser} from './html-token-parser'


export enum HTMLNodeType {
	Tag,
	Text,
	Comment,
}

export class HTMLNode {

	type: HTMLNodeType
	tagName: string | undefined
	text: string | undefined
	attrs: HTMLAttribute[] | undefined

	children: HTMLNode[] = []
	parent: HTMLNode | null = null

	constructor(type: HTMLNodeType, token: Omit<HTMLToken, 'type'>) {
		this.type = type
		this.tagName = token.tagName
		this.attrs = token.attrs
		this.text = token.text
	}

	private setParent(parent: HTMLNode | null) {
		this.parent = parent
	}

	get siblingIndex(): number {
		return this.parent!.children.indexOf(this)!
	}

	append(child: HTMLNode) {
		this.children.push(child)
		child.setParent(this)
	}

	prepend(child: HTMLNode) {
		this.children.unshift(child)
		child.setParent(this)
	}

	childAt(index: number): HTMLNode | null {
		return index >= 0 && index < this.children.length ? this.children[index] : null
	}

	before(sibling: HTMLNode) {
		this.parent!.children.splice(this.siblingIndex, 0, sibling)
	}

	after(sibling: HTMLNode) {
		this.parent!.children.splice(this.siblingIndex + 1, 0, sibling)
	}

	get previousSibling() {
		return this.parent!.childAt(this.siblingIndex - 1)
	}

	get nextSibling() {
		return this.parent!.childAt(this.siblingIndex + 1)
	}

	get firstChild(): HTMLNode | null {
		return this.childAt(0)
	}

	get lastChild(): HTMLNode | null {
		return this.childAt(this.children.length - 1)
	}

	*walk(): Iterable<HTMLNode> {
		yield this

		for (let child of [...this.children]) {

			// May be removed when walking.
			if (child.parent !== this) {
				continue
			}

			yield* child.walk()
		}
	}

	remove() {
		removeFromList(this.parent!.children, this)
		this.setParent(null)
	}

	/** Remove self, but keep children to replace it's position. */
	removeSelf() {
		let index = this.siblingIndex
		this.parent!.children.splice(index, 1, ...this.children)
		this.setParent(null)
	}

	removeAttr(attr: HTMLAttribute) {
		removeFromList(this.attrs!, attr)
	}

	wrapWith(tagName: string, attrs: HTMLAttribute[] = []) {
		let newNode = new HTMLNode(HTMLNodeType.Tag, {tagName, attrs})
		let index = this.siblingIndex

		this.parent!.children[index] = newNode
		newNode.setParent(this)
		newNode.append(this)
	}

	replaceWith(...nodes: HTMLNode[]) {
		let index = this.siblingIndex
		this.parent!.children.splice(index, 1, ...nodes)

		for (let node of nodes) {
			node.setParent(this.parent)
		}

		this.setParent(null)
	}

	closest(tag: string): HTMLNode | null {
		let node: HTMLNode | null = this

		while (node && node.tagName !== tag) {
			node = node.parent
		}

		return node
	}

	
	/** 
	 * Whether preceding position of current node is stable.
	 * Means will not remove, or insert other nodes before it.
	 */
	isPrecedingPositionStable(): boolean {
		if (this.type === HTMLNodeType.Comment) {
			return false
		}

		if (this.type === HTMLNodeType.Tag && this.tagName!.startsWith('lupos:')) {
			return false
		}

		if (this.type === HTMLNodeType.Tag
			&& TemplateSlotPlaceholder.isDynamicComponent(this.tagName!)
		) {
			return false
		}

		return true
	}

	toReadableString(tab = ''): string {
		if (this.type === HTMLNodeType.Tag) {
			return tab + `<${this.tagName}${this.toStringOfAttrs()}>`
				+ this.children.map(child => child.toReadableString(tab + '\t')).map(v => '\n' + v).join('')
			+ (this.children.length > 0 ? `\n${tab}` : '')
			+ `</${this.tagName}>`
		}
		else if (this.type === HTMLNodeType.Text) {
			return tab + this.text!
		}
		else {
			return tab + `<!--${this.text}-->\n`
		}
	}

	private toStringOfAttrs(): string {
		let joined: string[] = []

		for (let {name, value} of this.attrs!) {
			if (/^[.:?@$]/.test(name)) {
				continue
			}

			if (value === null) {
				joined.push(name)
			}
			else {
				if (value.includes('"')) {
					joined.push(name + "='" + value.replace(/[\\']/g, '\\$&') + "'")
				}
				else {
					joined.push(name + '="' + value.replace(/[\\]/g, '\\\\') + '"')
				}
			}
		}

		return joined.map(v => ' ' + v).join('')
	}

	toTemplateString(): string {
		if (this.type === HTMLNodeType.Tag) {
			let tagName = this.tagName!

			// Flow control
			if (tagName.startsWith('lupos:')) {
				return `<!---->`
			}

			// Component
			if (TemplateSlotPlaceholder.isComponent(tagName)) {
				tagName = 'div'
			}

			if (HTMLTokenParser.SelfClosingTags.includes(tagName)) {
				return `<${tagName}${this.toStringOfAttrs()} />`
			}

			let contents = this.children.map(child => child.toTemplateString()).join('')
			return `<${tagName}${this.toStringOfAttrs()}>${contents}</${tagName}>`
		}
		else if (this.type === HTMLNodeType.Text) {
			return this.text!
		}
		else {
			return `<!---->`
		}
	}

	/** Get string of all the contents. */
	getContentString() {
		return this.children.map(child => child.toTemplateString()).join('')
	}
}
