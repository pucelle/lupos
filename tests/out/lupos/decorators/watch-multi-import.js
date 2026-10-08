import { Component } from 'lupos.html';
import { trackGet, MultiWatcher } from 'lupos';
/** Ensure string multi-watchers import tracking without other observed reads. */
export class TestWatchMultiImport extends Component {
    /** First value read only by a generated watcher getter. */
    value = 0;
    /** Second value read only by a generated watcher getter. */
    otherValue = 1;
    onCreated() {
        super.onCreated();
        this.$onValuesChange_multiWatcher = new MultiWatcher([
            function () {
                trackGet(this, 'value');
                return this.value;
            },
            function () {
                trackGet(this, 'otherValue');
                return this.otherValue;
            }
        ], this.onValuesChange, this);
    }
    onConnected() {
        super.onConnected();
        this.$onValuesChange_multiWatcher.connect();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        this.$onValuesChange_multiWatcher.disconnect();
    }
    onValuesChange(values) {
        console.log(values);
    }
}
