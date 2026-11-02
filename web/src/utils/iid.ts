/** Current of `component.incrementalId`. */
let incrementalId = 1

/** Current of `component.incrementalId`. */
export function getIncrementalId() {
	return incrementalId++
}

