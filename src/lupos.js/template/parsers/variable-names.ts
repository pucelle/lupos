import {DoubleKeysMap} from "../../../utils"

export namespace VariableNames {

	export const context = '$context'
	export const values = '$values'
	export const latestValues = '$latestValues'
	export const html = '$html'
	export const template = '$template'
	export const node = '$node'
	export const latest = '$latest'
	export const slot = '$slot'
	export const com = '$com'
	export const binding = '$binding'
	export const block = '$block'

	const AreaIndexMap: Map<any, number> = new Map()
	const AreaDoublyIndexMap: DoubleKeysMap<any, string, number> = new DoubleKeysMap()


	/** Initialize before loading a new source file. */
	export function init() {
		AreaIndexMap.clear()
		AreaDoublyIndexMap.clear()
	}

	export function getUniqueIndex(area: any) {
		let index = AreaIndexMap.get(area) ?? -1
		index++
		AreaIndexMap.set(area, index)

		return index
	}

	export function getUniqueName(prefix: string) {
		return prefix + '_' + getUniqueIndex(prefix)
	}

	export function getDoublyUniqueIndex(innerArea: string, outerArea: any) {
		let index = AreaDoublyIndexMap.get(outerArea, innerArea) ?? -1
		index++
		AreaDoublyIndexMap.set(outerArea, innerArea, index)

		return index
	}

	export function getDoublyUniqueName(prefix: string, area: any) {
		return prefix + '_' + getDoublyUniqueIndex(prefix, area)
	}
}