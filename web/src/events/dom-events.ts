import {InternalWeakPairKeysListMap} from '../structs/map-weak'


type EventHandler = (e: Event) => void

/** Cache a event listener. */
interface EventListener {
	type: string
	handler: EventHandler
	boundHandler: EventHandler
	scope: any
}


/** All event types. */
export type EventType = keyof GlobalEventHandlersEventMap | keyof WindowEventHandlersEventMap

/** Infer event handler by event type. */
export type InferEventHandlerByType<T extends EventType> = (e: (GlobalEventHandlersEventMap & WindowEventHandlersEventMap)[T]) => void


/** Cache event listeners. */
const EventListenerMap: InternalWeakPairKeysListMap<EventTarget, string, EventListener> = new InternalWeakPairKeysListMap()


/** 
 * Bind an event listener on an event target.
 * Can specify `scope` to identify listener when un-binding, and will pass it to listener handler.
 */
export function on<T extends EventType>(
	el: EventTarget,
	type: T,
	handler: InferEventHandlerByType<T>,
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
	handler: InferEventHandlerByType<T>,
	scope: any = null,
	options: AddEventListenerOptions = {}
) {
	options.once = true
	on(el, type, handler, scope, options)
}


/** Bind event internally. */
export function bindEvent(
	el: EventTarget,
	type: EventType,
	handler: InferEventHandlerByType<any>,
	scope: any,
	boundHandler: InferEventHandlerByType<any>,
	options: AddEventListenerOptions
) {
	if (options.once) {
		boundHandler = bindOnce(el, type, handler, scope, boundHandler)
	}

	let eventListener = {
		type,
		handler,
		boundHandler,
		scope,
	}

	EventListenerMap.add(el, type, eventListener)
	el.addEventListener(type, boundHandler, options)
}


function bindOnce(el: EventTarget, type: EventType, handler: EventHandler, scope: any, boundHandler: EventHandler) {
	return function(e: Event) {
		boundHandler(e)
		off(el, type, handler, scope)
	}
}


/** 
 * Unbind all event listeners that match specified parameters.
 * If `handler` binds a `scope`, here it must provide the same value to remove the listener.
 */
export function off<T extends EventType>(el: EventTarget, type: T, handler: InferEventHandlerByType<T>, scope: any = null) {
	let listeners = EventListenerMap.get(el, type)
	if (!listeners) {
		return
	}

	for (let i = listeners.length - 1; i >= 0; i--) {
		let listener = listeners[i]
		
		if (listener.handler === handler && (!scope || listener.scope === scope)) {
			el.removeEventListener(type, listener.boundHandler)
			EventListenerMap.delete(el, type, listener)
		}
	}
}