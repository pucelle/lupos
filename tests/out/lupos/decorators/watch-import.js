import { Component } from 'lupos.html';
import { trackGet, Watcher } from 'lupos';
/** Ensure string watchers import tracking without other observed reads in the file. */
export class TestWatchImport extends Component {
    /** Value read only by the generated watcher getter. */
    value = 0;
    onCreated() {
        super.onCreated();
        this.$onValueChange_watcher = new Watcher(function () {
            trackGet(this, 'value');
            return this.value;
        }, this.onValueChange, this);
    }
    onConnected() {
        super.onConnected();
        this.$onValueChange_watcher.connect();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        this.$onValueChange_watcher.disconnect();
    }
    onValueChange(value) {
        console.log(value);
    }
}
