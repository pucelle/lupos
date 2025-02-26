import {DeclarationScope, Hashing, helper} from '../../core'
import {AccessNode, ListMap} from '../../lupos-ts-module'
import {CapturedItem, TrackingCapturer} from './capturer'


export interface CapturedHash {
	item: CapturedItem
	expHashName: string
	keyHashName: string

	/** The variable declaration scopes that current node used. */
	usedScopes: DeclarationScope[]
}


/** Manage a group of hashed captured items. */
export class CapturedHashMap {

	/** Make a hash map from items. */
	static fromCapturedItems(items: Iterable<CapturedItem>): CapturedHashMap {
		let map = new CapturedHashMap()

		for (let item of items) {

			// Has been referenced, will be replaced.
			if (item.referencedAtInternal) {
				continue
			}

			let hashed = CapturedHashing.hash(item)
			if (!map.covers(hashed)) {
				map.add(hashed)
			}
		}

		return map
	}

	/** Make a hash map from intersection of several capturers. */
	static fromCapturersIntersection(capturers: TrackingCapturer[]): CapturedHashMap {
		let map = CapturedHashMap.fromCapturedItems(capturers[0].iterateNotReferencedImmediateRunAndAlwaysRunCapturedItems())
			
		for (let i = 1; i < capturers.length; i++) {
			let mapI = CapturedHashMap.fromCapturedItems(capturers[i].iterateNotReferencedImmediateRunAndAlwaysRunCapturedItems())
			map.intersect(mapI)
		}

		// Replace item, or it will mix with descendant items and cause can't eliminate them.
		map.replaceItems()

		return map
	}

	/** Make a hash map from union of several capturers. */
	static fromCapturersUnion(capturers: TrackingCapturer[]): CapturedHashMap {
		let map = new CapturedHashMap()
			
		for (let i = 0; i < capturers.length; i++) {
			let mapI = CapturedHashMap.fromCapturedItems(capturers[i].iterateNotReferencedImmediateRunAndAlwaysRunCapturedItems())
			map.union(mapI)
		}

		return map
	}


	/** `expHash` -> `CapturerHashItem`. */
	private map: ListMap<string, CapturedHash> = new ListMap();

	/** Get all captured items. */
	*items(): Iterable<CapturedItem> {
		for (let hash of this.map.values()) {
			yield hash.item
		}
	}

	/** 
	 * Test whether existing hash items can cover target captured item.
	 * E.g., `a['']` covers `a.b`.
	 */
	covers(hash: CapturedHash) {
		let existingItems = this.map.get(hash.expHashName)
		if (!existingItems) {
			return false
		}

		for (let ei of existingItems) {

			// Key equals, or '' key exists.
			let keyMatch = ei.keyHashName === '""' || ei.keyHashName === hash.keyHashName
			if (!keyMatch) {
				continue
			}

			// Capture type equals, or 'set' type exists.
			let typeMatch = ei.item.type === hash.item.type || ei.item.type === 'set'
			if (!typeMatch) {
				continue
			}

			return true
		}

		return false
	}

	/** Test whether have existing hash items that nearly equals hash. */
	hasSame(hash: CapturedHash) {
		let existingItems = this.map.get(hash.expHashName)
		if (!existingItems) {
			return false
		}

		for (let ei of existingItems) {
			if (ei.keyHashName === hash.keyHashName && ei.item.type === hash.item.type) {
				return true
			}
		}

		return false
	}

	/** Test whether has specified hash by compare their `item` value. */
	has(hash: CapturedHash) {
		let existingItems = this.map.get(hash.expHashName)
		if (!existingItems) {
			return false
		}

		return existingItems.find(v => v.item === hash.item)
	}

	/** 
	 * Add a captured item hash result.
	 * Most have tested `cover(item)` and ensure it is `false`.
	 */
	add(item: CapturedHash) {

		// Delete all others if have empty key captured.
		if (item.keyHashName === '""') {
			this.map.deleteOf(item.expHashName)
		}

		this.map.add(item.expHashName, item)
	}

	/** Intersect with another captured hash map. */
	intersect(map: CapturedHashMap) {
		for (let item of [...this.map.values()]) {
			if (!map.hasSame(item)) {
				this.map.delete(item.expHashName, item)
			}
		}
	}

	/** Union with another captured hash map. */
	union(map: CapturedHashMap) {
		for (let item of map.map.values()) {
			this.add(item)
		}
	}

	/** Replace all hash items to a different object. */
	replaceItems() {
		for (let hash of this.map.values()) {
			hash.item = {...hash.item}
		}
	}

	/** Clone hash map. */
	clone() {
		let newMap = new CapturedHashMap()
		newMap.map = this.map.clone()

		return newMap
	}

	/** Clear hash map. */
	clear() {
		this.map.clear()
	}
}


/** It helps to hash all captured item. */
export namespace CapturedHashing {
	
	/** 
	 * Hash a captured item.
	 * Capture type will be encoded as part of hash value,
	 * This is required when work with `@effect`.
	 */
	export function hash(item: CapturedItem): CapturedHash {
		if (item.exp !== undefined) {
			let expHash = Hashing.hashNode(item.exp)
			let keyHashName = typeof item.key === 'string' ? '""' : String(item.key)

			return {
				item,
				expHashName: expHash.name,
				keyHashName: keyHashName,
				usedScopes: expHash.usedScopes,
			}
		}
		else {
			let exp = (item.node as AccessNode).expression
			let key = helper.access.getPropertyNode(item.node as AccessNode)
			let expHash = Hashing.hashNode(exp)
			let keyHash = Hashing.hashNode(key)

			return {
				item,
				expHashName: expHash.name,
				keyHashName: keyHash.name,
				usedScopes: [...expHash.usedScopes, ...keyHash.usedScopes],
			}
		}
	}
}