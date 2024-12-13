import * as ts from 'typescript'
import {HTMLNode, HTMLNodeType, TemplateSlotPlaceholder} from '../../lupos-ts-module'
import {helper} from '../../core'


export namespace HTMLNodeHelper {

	/** The nodes that have been used preceding position. */
	const PositionPrecedingPositionUsed: WeakSet<HTMLNode> = new WeakSet()


	/** 
	 * Whether preceding position of current node is stable.
	 * Means will not remove, or insert other nodes before it.
	 */
	export function isPrecedingPositionStable(node: HTMLNode, rawValueNodes: ts.Node[]): boolean {

		// Has been used.
		if (PositionPrecedingPositionUsed.has(node)) {
			return false
		}

		// Comment never.
		if (node.type === HTMLNodeType.Comment) {
			return false
		}

		// Will insert more nodes before.
		if (node.type === HTMLNodeType.Tag && node.tagName!.startsWith('lu:')) {
			return false
		}

		// All nodes may be removed from portal.
		if (node.parent?.type === HTMLNodeType.Tag && node.parent.tagName === 'lu:portal') {
			return false
		}

		// Will move nodes before.
		if (node.type === HTMLNodeType.Tag
			&& TemplateSlotPlaceholder.isDynamicComponent(node.tagName!)
		) {
			return false
		}

		// Named slot target will be moved.
		if (node.type === HTMLNodeType.Tag
			&& node.attrs!.find(attr => attr.name === ':slot')
		) {
			return false
		}

		// Text, if start with string, return true.
		if (node.type === HTMLNodeType.Text) {
			let {strings, valueIndices} = TemplateSlotPlaceholder.parseTemplateContent(node.text!)

	
			// First part is value, and the value is not object type.
			// Next text node is not trimmed and splitted yet.
			if (valueIndices && (!strings || !strings[0].text.trim())) {
				let firstRawNode = rawValueNodes[valueIndices[0].index]
				let type = helper.types.typeOf(firstRawNode)

				if (!helper.types.isValueType(type)) {
					return false
				}
			}
		}

		return true
	}


	/** Use node preceding position. */
	export function usePrecedingPosition(node: HTMLNode) {
		PositionPrecedingPositionUsed.add(node)
	}


	/** Get readable string for identifying. */
	export function toReadableString(node: HTMLNode, rawValueNodes: ts.Node[], tab = ''): string {
		if (node.type === HTMLNodeType.Tag) {
			let tagName = node.tagName!
			let children = node.children.filter(child => child.type === HTMLNodeType.Tag || child.desc || child.text)

			let wrap = children.length === 0
				|| children.length === 1 && node.firstChild!.type === HTMLNodeType.Text
				? ''
				: '\n'

			return tab
				+ TemplateSlotPlaceholder.replaceTemplateContent(
					`<${tagName}${node.toStringOfAttrs(true)}${children.length === 0 ? ' /' : ''}>`,
					(index: number) => '${' + helper.getFullText(rawValueNodes[index]) + '}'
				)
				+ children.map(child => toReadableString(child, rawValueNodes, wrap ? tab + '\t' : ''))
					.map(v => wrap + v).join('')
				+ (wrap ? wrap + tab : '')
				+ (children.length > 0
					? `</${TemplateSlotPlaceholder.isDynamicComponent(tagName) ? '' : tagName}>`
					: ''
				)
		}
		else if (node.desc) {
			return TemplateSlotPlaceholder.replaceTemplateContent(
				tab + node.desc,
				(index: number) => '${' + helper.getFullText(rawValueNodes[index]) + '}'
			)
		}
		else if (node.type === HTMLNodeType.Text) {
			return node.text!
		}
		else {
			return ''
		}
	}
}
