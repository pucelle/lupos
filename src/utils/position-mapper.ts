export class PositionMapper {

	private fromTo: {from: number, diff: number}[] = []
	private indexCache: number = 0

	add(from: number, to: number) {
		this.fromTo.push({from, diff: to - from})
	}

	map(from: number): number {
		if (this.fromTo.length === 0) {
			return from
		}

		let index = this.findIndex(from)
		let diff = this.fromTo[index].diff

		return from + diff
	}

	private findIndex(from: number) {
		let index = this.indexCache

		if (this.fromTo[index].from <= from) {

			// Cache available.
			if (index === this.fromTo.length - 1
				|| this.fromTo[index + 1].from > from
			) {
				return index
			}
			
			// Cache expire, but can look after to find cache.
			for (let i = index + 1; i < this.fromTo.length - 1; i++) {
				if (this.fromTo[i + 1].from > from) {
					return this.indexCache = i
				}
			}
		}

		// Find from all.
		for (let i = 0; i < this.fromTo.length - 1; i++) {
			if (this.fromTo[i + 1].from > from) {
				return this.indexCache = i
			}
		}

		return this.indexCache = this.fromTo.length - 1
	}
}