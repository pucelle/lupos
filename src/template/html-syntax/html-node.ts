import type TS from 'typescript'
import {Helper, TemplateSlotPlaceholder} from '../../base'
import {removeFromList} from '../../utils'
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

	/** Description for text and comment node. */
	desc: string | null = null

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

	append(...children: HTMLNode[]) {
		this.children.push(...children)
		children.forEach(c => c.setParent(this))
	}

	prepend(...children: HTMLNode[]) {
		this.children.unshift(...children)
		children.forEach(c => c.setParent(this))
	}

	childAt(index: number): HTMLNode | null {
		return index >= 0 && index < this.children.length ? this.children[index] : null
	}

	before(...siblings: HTMLNode[]) {
		this.parent!.children.splice(this.siblingIndex, 0, ...siblings)
		siblings.forEach(s => s.setParent(this.parent))
	}

	after(...siblings: HTMLNode[]) {
		this.parent!.children.splice(this.siblingIndex + 1, 0, ...siblings)
		siblings.forEach(s => s.setParent(this.parent))
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

	/** Remove all child nodes. */
	empty() {
		this.children = []
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
		attr.removed = true
	}

	wrapWith(tagName: string, attrs: HTMLAttribute[] = []) {
		let newNode = new HTMLNode(HTMLNodeType.Tag, {tagName, attrs})
		let index = this.siblingIndex

		this.parent!.children[index] = newNode
		newNode.setParent(this.parent)
		newNode.append(this)
	}

	/** Append all children to a new node, and append it to self. */
	wrapChildrenWith(tagName: string, attrs: HTMLAttribute[] = []) {
		let newNode = new HTMLNode(HTMLNodeType.Tag, {tagName, attrs})
		newNode.append(...this.children)

		this.children = []
		this.append(newNode)
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

		// Named slot target will be moved.
		if (this.type === HTMLNodeType.Tag
			&& this.attrs!.find(attr => attr.name === ':slot')
		) {
			return false
		}

		return true
	}

	toReadableString(rawNodes: TS.Node[], tab = ''): string {
		if (this.type === HTMLNodeType.Tag) {
			let tagName = this.tagName!
			let children = this.children.filter(child => child.type === HTMLNodeType.Tag || child.desc || child.text)

			let wrap = children.length === 0
				|| children.length === 1 && this.firstChild!.type === HTMLNodeType.Text
				? ''
				: '\n'

			return tab
				+ TemplateSlotPlaceholder.replaceTemplateString(
					`<${tagName}${this.toStringOfAttrs(true)}${children.length === 0 ? ' /' : ''}>`,
					(index: number) => '${' + Helper.getFullText(rawNodes[index]) + '}'
				)
				+ children.map(child => child.toReadableString(rawNodes, wrap ? tab + '\t' : ''))
					.map(v => wrap + v).join('')
				+ (wrap ? wrap + tab : '')
				+ (children.length > 0
					? `</${TemplateSlotPlaceholder.isDynamicComponent(tagName) ? '' : tagName}>`
					: ''
				)
		}
		else if (this.desc) {
			return TemplateSlotPlaceholder.replaceTemplateString(
				tab + this.desc,
				(index: number) => '${' + Helper.getFullText(rawNodes[index]) + '}'
			)
		}
		else if (this.type === HTMLNodeType.Text && this.text) {
			return this.text
		}
		else {
			return ''
		}
	}

	private toStringOfAttrs(includeRemoved: boolean): string {
		let joined: string[] = []

		for (let {name, value, removed, quoted} of this.attrs!) {
			if (!includeRemoved && removed) {
				continue
			}

			if (value === null) {
				joined.push(name)
			}
			else {
				if (TemplateSlotPlaceholder.isCompleteSlotIndex(value) && !quoted) {
					joined.push(name + "=" + value)
				}
				else if (value.includes('"')) {
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
				return `<${tagName}${this.toStringOfAttrs(false)} />`
			}

			let contents = this.children.map(child => child.toTemplateString()).join('')
			return `<${tagName}${this.toStringOfAttrs(false)}>${contents}</${tagName}>`
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
