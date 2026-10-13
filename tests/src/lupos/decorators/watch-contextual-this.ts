import {Connectable, Observed, UnObserved, watch, watchMulti} from '../../../../web/out'


/** Plain nested data inherits observation from its owning class. */
interface SelectionData<T> {

	/** Selection read by the watcher getter. */
	currentSelection: T | null
}


/** Cover inferred callback receivers on generic observed classes. */
export class TestWatchContextualThis<T> implements Connectable, Observed {

	/** Nested data without an explicit observation marker. */
	protected data: SelectionData<T> = {currentSelection: null}

	/** Explicitly unobserved contents must not inherit class observation. */
	protected ignored: UnObserved<SelectionData<T>> = {currentSelection: null}

	/** Initialize generated observers. */
	onCreated() {}

	/** Connect generated observers. */
	onConnected() {}

	/** Disconnect generated observers. */
	onWillDisconnect() {}

	/** Infer the observed receiver through the decorator's generic this parameter. */
	@watch(function() {return this.data.currentSelection})
	onSelectionChange(selection: T | null) {
		console.log(selection)
	}

	/** Multi-watchers must propagate the same inferred receiver observation. */
	@watchMulti([function() {return this.data.currentSelection}])
	onSelectionsChange(selections: [T | null]) {
		console.log(selections)
	}

	/** Preserve an explicit opt-out on the nested property. */
	@watch(function() {return this.ignored.currentSelection})
	onIgnoredSelectionChange(selection: T | null) {
		console.log(selection)
	}

	/** An explicit callback receiver opt-out takes precedence over inference. */
	@watch(function(this: UnObserved<TestWatchContextualThis<T>>) {
		return this.data.currentSelection
	})
	onUnobservedReceiverChange(selection: T | null) {
		console.log(selection)
	}
}
