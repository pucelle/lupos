import type TS from 'typescript'
import {HTMLNode} from '../../html-syntax'


export interface LatestBindingInfo {
	name: string
	node: HTMLNode
	queryParameter: TS.Expression | null
}


let latest: LatestBindingInfo | null = null


/** Can only set when doing `init`. */
export function setLatestBindingInfo(node: HTMLNode, name: string, queryParameter: TS.Expression | null) {
	latest = {
		node,
		name,
		queryParameter,
	}
}


/** Can only set when doing `init`. */
export function getLatestBindingInfo(node: HTMLNode): LatestBindingInfo | null {
	if (!latest || latest.node !== node) {
		return null
	}

	return latest
}