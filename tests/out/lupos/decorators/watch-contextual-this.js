import { Connectable, Observed, UnObserved } from '../../../../web/out';
import { Watcher, MultiWatcher, trackGet } from "lupos";
/** Cover inferred callback receivers on generic observed classes. */
export class TestWatchContextualThis {
    /** Nested data without an explicit observation marker. */
    data = { currentSelection: null };
    /** Explicitly unobserved contents must not inherit class observation. */
    ignored = { currentSelection: null };
    /** Initialize generated observers. */
    onCreated() {
        this.$onSelectionChange_watcher = new Watcher(function () { trackGet(this, "data"); trackGet(this.data, "currentSelection"); return this.data.currentSelection; }, this.onSelectionChange, this);
        this.$onSelectionsChange_multiWatcher = new MultiWatcher([
            function () { trackGet(this, "data"); trackGet(this.data, "currentSelection"); return this.data.currentSelection; }
        ], this.onSelectionsChange, this);
        this.$onIgnoredSelectionChange_watcher = new Watcher(function () { trackGet(this, "ignored"); return this.ignored.currentSelection; }, this.onIgnoredSelectionChange, this);
        this.$onUnobservedReceiverChange_watcher = new Watcher(function () {
            return this.data.currentSelection;
        }, this.onUnobservedReceiverChange, this);
    }
    /** Connect generated observers. */
    onConnected() {
        this.$onSelectionChange_watcher.connect();
        this.$onSelectionsChange_multiWatcher.connect();
        this.$onIgnoredSelectionChange_watcher.connect();
        this.$onUnobservedReceiverChange_watcher.connect();
    }
    /** Disconnect generated observers. */
    onWillDisconnect() {
        this.$onSelectionChange_watcher.disconnect();
        this.$onSelectionsChange_multiWatcher.disconnect();
        this.$onIgnoredSelectionChange_watcher.disconnect();
        this.$onUnobservedReceiverChange_watcher.disconnect();
    }
    onSelectionChange(selection) {
        console.log(selection);
    }
    onSelectionsChange(selections) {
        console.log(selections);
    }
    onIgnoredSelectionChange(selection) {
        console.log(selection);
    }
    onUnobservedReceiverChange(selection) {
        console.log(selection);
    }
}
