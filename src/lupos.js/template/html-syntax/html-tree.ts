import {HTMLNode, HTMLNodeType} from './html-node'
import {HTMLTokenParser, HTMLTokenType} from './html-token-parser'


export class HTMLTree extends HTMLNode {

	static fromString(string: string): HTMLTree {
		let tokens = HTMLTokenParser.parseToTokens(string)
		let tree = new HTMLTree()
		let current: HTMLNode = tree

		for (let token of tokens) {
			switch (token.type) {
				case HTMLTokenType.StartTag:
					let node = new HTMLNode(HTMLNodeType.Tag, token)
					current.append(node)
					current = node
					break

				case HTMLTokenType.EndTag:
					current = current.parent!
					break

				case HTMLTokenType.Text:
					current.append(new HTMLNode(HTMLNodeType.Text, token))
					break

				case HTMLTokenType.Comment:
					current.append(new HTMLNode(HTMLNodeType.Comment, token))
					break
			}
		}

		return tree
	}

	static fromSeparating(node: HTMLNode): HTMLTree {
		node.remove()
		let tree = new HTMLTree()
		tree.append(node)

		return tree
	}

	static fromSeparatingChildren(node: HTMLNode): HTMLTree {
		let tree = new HTMLTree()

		for (let child of node.children) {
			child.remove()
			tree.append(child)
		}

		return tree
	}

	constructor() {
		super(HTMLNodeType.Tag, {tagName: 'template', attrs: []})
	}

	/** Get string of all contents. */
	getContentString() {
		return this.children.map(child => child.toTemplateString()).join('')
	}
}