import {HTMLNodeReferences} from './html-node-references'
import {HTMLToken, HTMLTokenParser, HTMLTokenType} from './html-token-parser'


export enum HTMLNodeType {
	Tag,
	Text,
	Comment,
}

export class HTMLNode {

	readonly type: HTMLNodeType
	readonly token: HTMLToken

	children: HTMLNode[] = []
	parent: HTMLNode | null = null

	constructor(type: HTMLNodeType, token: HTMLToken) {
		this.type = type
		this.token = token
	}

	addChild(child: HTMLNode) {
		this.children!.push(child)
		child.setParent(this)
	}

	private setParent(parent: HTMLNode) {
		this.parent = parent
	}
}


export class HTMLTree extends HTMLNode {

	static fromTokens(string: string): HTMLTree {
		let tokens = HTMLTokenParser.parseToTokens(string)
		let tree = new HTMLTree()
		let current: HTMLNode = tree

		for (let token of tokens) {
			switch (token.type) {
				case HTMLTokenType.StartTag:
					let node = new HTMLNode(HTMLNodeType.Tag, token)
					current.addChild(node)
					current = node
					break

				case HTMLTokenType.EndTag:
					current = current.parent!
					break

				case HTMLTokenType.Text:
					current.addChild(new HTMLNode(HTMLNodeType.Text, token))
					break

				case HTMLTokenType.Comment:
					current.addChild(new HTMLNode(HTMLNodeType.Comment, token))
					break
			}
		}

		return tree
	}


	private references: HTMLNodeReferences
	
	constructor() {
		super(HTMLNodeType.Tag, {type: HTMLTokenType.StartTag, tagName: 'template'})
		this.references = new HTMLNodeReferences(this)
	}


}