import {Component} from 'lupos.html'
import {watchMulti} from 'lupos'


/** Ensure string multi-watchers import tracking without other observed reads. */
export class TestWatchMultiImport extends Component {

	/** First value read only by a generated watcher getter. */
	value: number = 0

	/** Second value read only by a generated watcher getter. */
	otherValue: number = 1

	/** Watch properties without introducing tracking in the callback. */
	@watchMulti(['value', 'otherValue'])
	onValuesChange(values: [number, number]) {
		console.log(values)
	}
}
