import type TS from 'typescript'
import {Helper} from './helper'
import {definePreVisitCallback} from './visitor-callbacks'


export namespace Imports {

	/** All added imports. */
	const ImportsMap: Map<string, TS.ImportSpecifier> = new Map()


	/** Initialize after loading a new source file. */
	export function initialize() {
		ImportsMap.clear()
	}

	/** Add an import item when visiting nodes. */
	export function add(node: TS.ImportSpecifier) {
		ImportsMap.set(Helper.getText(node.name), node)
	}

	export function getImportByName(name: string): TS.ImportSpecifier | undefined {
		return ImportsMap.get(name)
	}
}


definePreVisitCallback(Imports.initialize)