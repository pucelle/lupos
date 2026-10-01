import {Component} from 'lupos.html'
import {Observed} from '../../../../web/out'


export class TestMap extends Component {

	map: Map<number, number> = new Map()

	set() {
		this.map.set(0, 1)
	}
}


export class TestSet extends Component {

	set: Set<number> = new Set()

	add() {
		this.set.add(0)
	}
}


/** Optional collection writes must not evaluate arguments for absent receivers. */
export class TestOptionalCollectionWrite {

	/** Skip both computed arguments when the Map is absent. */
	set(map: Observed<Map<number, number>> | undefined, key: () => number, value: () => number) {
		return map?.set(key(), value())
	}

	/** Preserve the mutation result and guard its tracking. */
	delete(map: Observed<Map<number, number>> | undefined) {
		return map?.delete(0)
	}

	/** Support nullable Set receivers without evaluating the value twice. */
	add(set: Observed<Set<number>> | null, value: () => number) {
		return set?.add(value())
	}
}
