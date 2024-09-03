import {HTMLNode, HTMLNodeType} from './html-node'
import {HTMLTokenParser, HTMLTokenType} from './html-token-parser'


export class HTMLRoot extends HTMLNode {

	static fromString(string: string): HTMLRoot {
		let tokens = HTMLTokenParser.parseToTokens(string)
		let tree = new HTMLRoot()
		let current: HTMLNode | null = tree

		for (let token of tokens) {
			switch (token.type) {
				case HTMLTokenType.StartTag:
					let node = new HTMLNode(HTMLNodeType.Tag, token)
					current.append(node)
					current = node
					break

				case HTMLTokenType.EndTag:
					do {
						if (current.tagName === token.tagName) {
							current = current.parent
							break
						}

						if (token.tagName === '') {
							current = current.parent
							break
						}

						current = current.parent
					} while (current)

					break

				case HTMLTokenType.Text:
					current.append(new HTMLNode(HTMLNodeType.Text, token))
					break

				case HTMLTokenType.Comment:
					current.append(new HTMLNode(HTMLNodeType.Comment, token))
					break
			}

			if (!current) {
				break
			}
		}

		return tree
	}

	static fromSeparating(node: HTMLNode): HTMLRoot {
		node.remove()
		let tree = new HTMLRoot()
		tree.append(node)

		return tree
	}

	static fromSeparatingChildren(node: HTMLNode): HTMLRoot {
		let root = new HTMLRoot()

		for (let child of node.children) {
			child.remove()
			root.append(child)
		}

		return root
	}

	constructor() {
		super(HTMLNodeType.Tag, {tagName: 'root', attrs: []})
	}

	getContentString() {
		if (this.firstChild?.tagName === 'template') {
			return this.firstChild.getContentString()
		}
		else {
			return super.getContentString()
		}
	}
}