import {HTMLNode} from '../../../lupos-ts-module'


export interface LatestBindingInfo {
	name: string
	node: HTMLNode
	setRefBindingName: (refBindName: string) => void
}


let latest: LatestBindingInfo | null = null


/** Can only set when doing `preInit`. */
export function setLatestBindingInfo(
	node: HTMLNode,
	name: string,
	setRefBindingName: (refBindName: string) => void,
) {
	latest = {
		node,
		name,
		setRefBindingName,
	}
}


/** Can only get when doing `preInit`. */
export function getLatestBindingInfo(node: HTMLNode): LatestBindingInfo | null {
	if (!latest || latest.node !== node) {
		return null
	}

	return latest
}