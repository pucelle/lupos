import {HTMLNode} from '../../../lupos-ts-module'
import {createTransformSessionStateKey, transformSession} from '../../../core'


export interface LatestBindingInfo {
	name: string
	node: HTMLNode
	setRefBindingName: (refBindName: string) => void
}


const StateKey = createTransformSessionStateKey<{latest: LatestBindingInfo | null}>('LatestBinding')

function getState() {
	return transformSession.getState(StateKey, () => ({latest: null}))
}


/** Can only set when doing `preInit`. */
export function setLatestBindingInfo(
	node: HTMLNode,
	name: string,
	setRefBindingName: (refBindName: string) => void,
) {
	getState().latest = {
		node,
		name,
		setRefBindingName,
	}
}


/** Can only get when doing `preInit`. */
export function getLatestBindingInfo(node: HTMLNode): LatestBindingInfo | null {
	let latest = getState().latest
	if (!latest || latest.node !== node) {
		return null
	}

	return latest
}
