import {Component} from 'lupos.html'
import {watch} from 'lupos'


/** Ensure string watchers import tracking without other observed reads in the file. */
export class TestWatchImport extends Component {

	/** Value read only by the generated watcher getter. */
	value: number = 0

	/** Watch a property without introducing tracking in the callback. */
	@watch('value')
	onValueChange(value: number) {
		console.log(value)
	}
}
