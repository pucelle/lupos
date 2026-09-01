import ts from 'typescript'


/** A unique key for state owned by one transformed source file. */
export type TransformSessionStateKey<T> = symbol & {readonly __stateType?: T}


/** Create a typed key for lazily initialized session state. */
export function createTransformSessionStateKey<T>(description: string): TransformSessionStateKey<T> {
	return Symbol(description) as TransformSessionStateKey<T>
}


/** Mutable state whose lifetime is limited to one transformed source file. */
export class TransformSession {

	readonly sourceFile: ts.SourceFile

	private readonly state: Map<symbol, unknown> = new Map()
	private justVisitedCallbacks: (() => void)[] = []

	constructor(sourceFile: ts.SourceFile) {
		this.sourceFile = sourceFile
	}

	/** Get source-local state, creating it on first use. */
	getState<T>(key: TransformSessionStateKey<T>, create: () => T): T {
		if (!this.state.has(key)) {
			this.state.set(key, create())
		}

		return this.state.get(key) as T
	}

	/** 
	 * Run a callback after visiting the whole source file, before post-visit hooks.
	 * Normally output something after visited whole source file,
	 * and all normal visitors have completed outputting interpolation.
	 * Run before post visit callbacks.
	 */
	onJustVisited(callback: () => void) {
		this.justVisitedCallbacks.push(callback)
	}

	/** Run and release all callbacks deferred while visiting this source file. */
	callJustVisitedCallbacks() {
		let callbacks = this.justVisitedCallbacks
		this.justVisitedCallbacks = []

		for (let callback of callbacks) {
			callback()
		}
	}
}
