import {InternalWeakFirstPairKeysListMap} from '../structs/map-weak'
import {EventType, InferEventHandler} from './types'


type EventHandler = (e: Event) => void

/** Cache a event listener. */
interface EventListener {
	type: string
	handler: EventHandler
	boundHandler: EventHandler
	scope: any
	capture: boolean
}



/** Cache event listeners. */
const EventListenerMap: InternalWeakFirstPairKeysListMap<EventTarget, string, EventListener> = /*#__PURE__*/new InternalWeakFirstPairKeysListMap()


/** 
 * Bind an event listener on an event target.
 * Can specify `scope` to identify listener when un-binding, and will pass it to listener handler.
 */
export function on<T extends EventType>(
	el: EventTarget,
	type: T,
	handler: InferEventHandler<T>,
	scope: any = null,
	options: AddEventListenerOptions = {}
) {
	let boundHandler = scope ? handler.bind(scope) : handler
	bindEvent(el, type, handler, scope, boundHandler, options)
}

/** 
 * Bind an event listener on an event target, triggers for only once.
 * Can specify `scope` to identify listener when un-binding, and will pass it to listener handler.
 * 
 * Equals bind with `once: true` in options.
 */
export function once<T extends EventType>(
	el: EventTarget,
	type: T,
	handler: InferEventHandler<T>,
	scope: any = null,
	options: AddEventListenerOptions = {}
) {
	on(el, type, handler, scope, {...options, once: true})
}


/** Bind event internally. */
export function bindEvent(
	el: EventTarget,
	type: EventType,
	handler: InferEventHandler<any>,
	scope: any,
	boundHandler: InferEventHandler<any>,
	options: AddEventListenerOptions
) {
	let eventListener: EventListener

	if (options.once) {
		let originalBoundHandler = boundHandler
		
		boundHandler = function(e: Event) {
			unbindEvent(el, eventListener)
			originalBoundHandler(e)
		}
	}

	eventListener = {
		type,
		handler,
		boundHandler,
		scope,
		capture: options.capture ?? false,
	}

	EventListenerMap.add(el, type, eventListener)
	el.addEventListener(type, boundHandler, options)
}

/** Unbind one exact cached listener. */
function unbindEvent(el: EventTarget, listener: EventListener) {
	el.removeEventListener(listener.type, listener.boundHandler, listener.capture)
	EventListenerMap.delete(el, listener.type, listener)
}


/** 
 * Unbind all event listeners that match specified parameters.
 * If provides `scope` here, only bound listeners with this scope will be released.
 */
export function off<T extends EventType>(el: EventTarget, type: T, handler: InferEventHandler<T>, scope: any = null, capture: boolean = false) {
	let listeners = EventListenerMap.get(el, type)
	if (!listeners) {
		return
	}

	for (let i = listeners.length - 1; i >= 0; i--) {
		let listener = listeners[i]
		
		if (listener.handler === handler
			&& (!scope || listener.scope === scope)
			&& listener.capture === capture
		) {
			unbindEvent(el, listener)
		}
	}
}
