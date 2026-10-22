import {PairKeysMap} from '../../lupos-ts-module'
import {createTransformSessionStateKey, transformSession} from '../../core'


interface VariableNameState {
	areaIndexMap: Map<any, number>
	areaDoublyIndexMap: PairKeysMap<any, string, number>
}


export namespace VariableNames {

	export const CONTEXT = '$context'
	export const VALUES = '$values'
	export const HTML = '$html'
	export const TEMPLATE = '$template'
	export const NODE = '$node'
	export const HYDRATES = '$hydrates'
	export const LOCATOR = '$locator'
	export const LATEST = '$latest'
	export const SLOT = '$slot'
	export const COM = '$com'
	export const BINDING = '$binding'
	export const DELEGATOR = '$delegator'
	export const BLOCK = '$block'

	const StateKey = createTransformSessionStateKey<VariableNameState>('VariableNames')

	function getState(): VariableNameState {
		return transformSession.getState(StateKey, () => ({
			areaIndexMap: new Map(),
			areaDoublyIndexMap: new PairKeysMap(),
		}))
	}

	export function getUniqueIndex(area: any) {
		let areaIndexMap = getState().areaIndexMap
		let index = areaIndexMap.get(area) ?? -1
		index++
		areaIndexMap.set(area, index)

		return index
	}

	export function buildName(prefix: string, index: number) {
		return prefix + '_' + index
	}

	export function getUniqueName(prefix: string) {
		return buildName(prefix, getUniqueIndex(prefix))
	}

	export function getDoublyUniqueIndex(innerArea: string, outerArea: any) {
		let areaDoublyIndexMap = getState().areaDoublyIndexMap
		let index = areaDoublyIndexMap.get(outerArea, innerArea) ?? -1
		index++
		areaDoublyIndexMap.set(outerArea, innerArea, index)

		return index
	}

	export function getDoublyUniqueName(prefix: string, area: any) {
		return buildName(prefix, getDoublyUniqueIndex(prefix, area))
	}
}
