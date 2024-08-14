import type TS from 'typescript'
import {Helper} from './helper'


export namespace Imports {

	/** All added imports. */
	const ImportsMap: Map<string, TS.ImportSpecifier> = new Map()


	/** Initialize after loading a new source file. */
	export function init() {
		ImportsMap.clear()
	}

	export function add(node: TS.ImportSpecifier) {
		ImportsMap.set(Helper.getText(node.name), node)
	}

	export function getImportByName(name: string): TS.ImportSpecifier | undefined {
		return ImportsMap.get(name)
	}

	export function getImportByNameLike(name: string): TS.ImportSpecifier | undefined {
		if (ImportsMap.has(name)) {
			return ImportsMap.get(name)
		}

		for (let node of ImportsMap.values()) {
			if (Helper.getText(node.name).toLowerCase() === name.toLowerCase()) {
				return node
			}
		}

		return undefined
	}
}