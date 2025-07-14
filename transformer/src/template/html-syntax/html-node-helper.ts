import * as ts from 'typescript'
import {HTMLNode, HTMLNodeType, TemplateSlotPlaceholder} from '../../lupos-ts-module'
import {helper} from '../../core'


export enum PrecedingPositionStability {
	Stable,
	WillInsertBefore,
	WillBeReplaced,
	WillBeRemoved,
}

export enum FollowingPositionStability {
	Stable,
	WillBeRemoved,
}


export namespace HTMLNodeHelper {

	/** The nodes that their preceding positions will be inserted more nodes. */
	const PrecedingPositionWillInsert: WeakSet<HTMLNode> = new WeakSet()


	/** 
	 * Whether preceding position of current node is stable.
	 * Means will not be removed, or insert other nodes before it.
	 */
	export function getPrecedingPositionStability(node: HTMLNode, rawValueNodes: ts.Node[]): PrecedingPositionStability {

		// Marked as willing to insert contents before.
		if (PrecedingPositionWillInsert.has(node)) {
			return PrecedingPositionStability.WillInsertBefore
		}

		// Comments are treated as newly appended, and will insert contents before.
		if (node.type === HTMLNodeType.Comment) {
			return PrecedingPositionStability.WillInsertBefore
		}

		// All nodes will be removed from portal.
		// Since all child nodes will be moved, no need to handle.
		// if (node.parent?.type === HTMLNodeType.Tag && node.parent.tagName === 'lu:portal') {
		// 	return false
		// }

		// Will work as comment and insert contents before.
		if (node.type === HTMLNodeType.Tag && node.tagName!.startsWith('lu:')) {
			return PrecedingPositionStability.WillInsertBefore
		}

		// Will replace whole dynamic component.
		if (node.type === HTMLNodeType.Tag
			&& TemplateSlotPlaceholder.isDynamicComponent(node.tagName!)
		) {
			return PrecedingPositionStability.WillBeReplaced
		}

		// Named slot target will be removed, can safely skip it.
		if (node.type === HTMLNodeType.Tag
			&& node.attrs!.find(attr => attr.name === ':slot')
		) {
			return PrecedingPositionStability.WillBeRemoved
		}

		// Text, if start with string, position persist, otherwise will insert contents.
		if (node.type === HTMLNodeType.Text) {
			let {strings, valueIndices} = TemplateSlotPlaceholder.parseTemplateContent(node.text!)

			// First part is value, and the value is not object type.
			// Next text node is not trimmed and splitted yet.
			if (valueIndices && (!strings || !strings[0].text.trim())) {
				let firstRawNode = rawValueNodes[valueIndices[0].index]
				let type = helper.types.typeOf(firstRawNode)

				if (!helper.types.isValueType(type)) {
					return PrecedingPositionStability.WillInsertBefore
				}
			}
		}

		return PrecedingPositionStability.Stable
	}


	/** Get following position stability of current node. */
	export function getFollowingPositionStability(node: HTMLNode): FollowingPositionStability {

		// Normally no need to consider those which's preceding positions are no stable,
		// which will cause a comment node to insert before

		// Named slot target will be moved.
		if (node.type === HTMLNodeType.Tag
			&& node.attrs!.find(attr => attr.name === ':slot')
		) {
			return FollowingPositionStability.WillBeRemoved
		}

		return FollowingPositionStability.Stable
	}


	/** Get next sibling which is stable, skips all nodes that will be removed. */
	export function findNextStableNode(startNode: HTMLNode, rawValueNodes: ts.Node[]): HTMLNode | null {
		let node: HTMLNode | null = startNode

		// Skip all sibling nodes that will be removed.
		// Reset to null if still not stable.
		if (node) {
			let stability = HTMLNodeHelper.getPrecedingPositionStability(node, rawValueNodes)

			while (node && stability === PrecedingPositionStability.WillBeRemoved) {
				node = node.nextSibling
				if (node) {
					stability = HTMLNodeHelper.getPrecedingPositionStability(node, rawValueNodes)
				}
			}
				
			if (node && stability !== PrecedingPositionStability.Stable) {
				node = null
			}
		}

		return node
	}


	/** Get previous sibling which is stable, skips all nodes that will be removed. */
	export function findPreviousStableNode(endNode: HTMLNode): HTMLNode | null {
		let node: HTMLNode | null = endNode

		// Skip all sibling nodes that will be removed.
		if (node) {
			let stability = HTMLNodeHelper.getFollowingPositionStability(node)

			while (node && stability === FollowingPositionStability.WillBeRemoved) {
				node = node.previousSibling

				if (node) {
					stability = HTMLNodeHelper.getFollowingPositionStability(node)
				}
			}
				
			if (node && stability !== FollowingPositionStability.Stable) {
				node = null
			}
		}

		return node
	}


	/** Will insert nodes to it's preceding position. */
	export function willInsertContentsBefore(node: HTMLNode) {
		PrecedingPositionWillInsert.add(node)
	}


	/** Whether can safely remove current node, and will not cause two sibling text nodes joining. */
	export function canSafelyRemoveNode(node: HTMLNode): boolean {
		let previousBeText = node.previousSibling?.type === HTMLNodeType.Text
		let nextBeText = node.nextSibling?.type === HTMLNodeType.Text
		
		if (previousBeText && nextBeText) {
			return false
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
