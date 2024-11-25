import * as ts from 'typescript'
import {HTMLNode, HTMLNodeType, TemplateSlotPlaceholder} from '../../lupos-ts-module'
import {helper} from '../../core'


export namespace HTMLNodeHelper {

	/** 
	 * Whether preceding position of current node is stable.
	 * Means will not remove, or insert other nodes before it.
	 */
	export function isPrecedingPositionStable(node: HTMLNode, rawValueNodes: ts.Node[]): boolean {
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
			let strings = TemplateSlotPlaceholder.parseTemplateStrings(node.text!)
			let valueIndices = TemplateSlotPlaceholder.getSlotIndices(node.text!)

			// First part is value, and the value is not object type.
			if (valueIndices && (!strings || !strings[0])) {
				let firstRawNode = rawValueNodes[valueIndices[0]]
				let type = helper.types.typeOf(firstRawNode)

				if (!helper.types.isValueType(type)) {
					return false
				}
			}
		}

		return true
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
				+ TemplateSlotPlaceholder.replaceTemplateString(
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
			return TemplateSlotPlaceholder.replaceTemplateString(
				tab + node.desc,
				(index: number) => '${' + helper.getFullText(rawValueNodes[index]) + '}'
			)
		}
		else if (node.type === HTMLNodeType.Text && node.text) {
			return node.text
		}
		else {
			return ''
		}
	}
}
