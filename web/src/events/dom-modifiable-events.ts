import * as DOMEvents from './dom-events'
import {ControlKeyCode, getControlKeyCode, getShortcutKey, getShortcutCode, ShortcutKey} from './event-keys'
import {EventType, InferEventHandler} from './types'


/** Event handler. */
type EventHandler = (e: Event) => void

/** All event modifiers organized by event type. */
type EventModifiers = {
	keydown: (typeof GLOBAL_EVENT_MODIFIERS)[number] | ShortcutKey
	keyup: (typeof GLOBAL_EVENT_MODIFIERS)[number] | ShortcutKey
	keypress: (typeof GLOBAL_EVENT_MODIFIERS)[number] | ShortcutKey

	mousedown: MouseEventModifiers
	mousemove: MouseEventModifiers
	mouseup: MouseEventModifiers
	mouseout: MouseEventModifiers
	mouseenter: MouseEventModifiers
	mouseleave: MouseEventModifiers
	
	pointerover: MouseEventModifiers
	pointerenter: MouseEventModifiers
	pointerdown: MouseEventModifiers
	pointermove: MouseEventModifiers
	pointerup: MouseEventModifiers
	pointercancel: MouseEventModifiers
	pointerout: MouseEventModifiers
	pointerleave: MouseEventModifiers
	pointerrawupdate: MouseEventModifiers
	gotpointercapture: MouseEventModifiers
	lostpointercapture: MouseEventModifiers

	click: (typeof GLOBAL_EVENT_MODIFIERS)[number] | keyof typeof BUTTON_NAME_MODIFIERS | ControlKeyCode
	dblclick: (typeof GLOBAL_EVENT_MODIFIERS)[number] | keyof typeof BUTTON_NAME_MODIFIERS | ControlKeyCode
	change: (typeof CHANGE_EVENT_MODIFIERS | typeof GLOBAL_EVENT_MODIFIERS)[number] | ControlKeyCode
	wheel: (typeof WHEEL_EVENT_MODIFIERS | typeof GLOBAL_EVENT_MODIFIERS)[number] | ControlKeyCode
}

type MouseEventModifiers = (typeof GLOBAL_EVENT_MODIFIERS)[number] | keyof typeof BUTTON_NAME_MODIFIERS | ControlKeyCode

/** Get event modifiers by event type. */
export type EventModifierByType<T extends string> = T extends keyof EventModifiers
	? EventModifiers[T]
	: (typeof GLOBAL_EVENT_MODIFIERS)[number]


/** Modifiers to filter events by event actions. */
const GLOBAL_EVENT_MODIFIERS = ['capture', 'self', 'once', 'prevent', 'stop', 'passive'] as const

/** Modifiers to filter change events. */
const CHANGE_EVENT_MODIFIERS = ['check', 'uncheck'] as const

/** Modifiers to filter wheel events. */
const WHEEL_EVENT_MODIFIERS = ['up', 'down'] as const

/** Modifiers to filter click events. */
const BUTTON_NAME_MODIFIERS = {
	left: 0,
	middle: 1,
	right: 2,
	main: 0,
	auxiliary: 1,
	secondary: 2,
}


/** Filter key event by event key. */
function keyEventFilter(e: KeyboardEvent, modifiers: string[]): boolean {
	let key = getShortcutKey(e)
	let code = getShortcutCode(e)
	
	return modifiers.includes(key) || modifiers.includes(code)
}

/** Filter mouse event by mouse button. */
function mouseEventFilter(e: MouseEvent, modifiers: string[]): boolean {
	let controlKey = modifiers.find(m => m.endsWith('+'))
	if (controlKey && getControlKeyCode(e) !== controlKey) {
		return false
	}

	let buttonModifiers = modifiers.filter(m => m in BUTTON_NAME_MODIFIERS) as (keyof typeof BUTTON_NAME_MODIFIERS)[]
	if (buttonModifiers.length === 0) {
		return true
	}

	if (buttonModifiers.find(m => BUTTON_NAME_MODIFIERS[m] === e.button)) {
		return true
	}

	return false
}

/** Filter change event by checkbox checked state. */
function changeEventFilter(e: Event, [modifier]: string[]) {
	let checked = (e.target as HTMLInputElement).checked

	return checked && modifier === 'check'
		|| !checked && modifier === 'uncheck'
}

/** Filter wheel event by wheel delta value. */
function wheelEventFilter(e: WheelEvent, [modifier]: string[]) {
	return (e.deltaY < 0) && modifier === 'up'
		|| (e.deltaY > 0) && modifier === 'down'
}

/** Event filters to limit by event type. */
const EVENT_FILTERS = {
	keydown: keyEventFilter,
	keyup: keyEventFilter,
	keypress: keyEventFilter,
	mousedown: mouseEventFilter,
	mousemove: mouseEventFilter,
	mouseup: mouseEventFilter,
	click: mouseEventFilter,
	dblclick: mouseEventFilter,
	change: changeEventFilter,
	wheel: wheelEventFilter,
}


/**
 * Register an event listener on an element with modifiers.
 * @param modifiers: can specify some modifier to limit event handler only be called when modifiers match.
 */
export function on<T extends EventType>(
	el: EventTarget,
	type: T,
	modifiers: EventModifierByType<T>[] | null,
	handler: InferEventHandler<T>,
	scope: any = null,
	options: AddEventListenerOptions = {}
) {
	let wrappedHandler = wrapHandler(el, type, modifiers as string[] | null, handler as EventHandler, scope)
	let capture = !!modifiers && (modifiers as string[]).includes('capture')
	let passive = !!modifiers && (modifiers as string[]).includes('passive')

	if (capture) {
		options.capture = true
	}
	
	if (passive) {
		options.passive = true
	}

	DOMEvents.bindEvent(el, type, handler, scope, wrappedHandler, options)
}


/** Wrap handler to filter by modifiers. */
function wrapHandler(el: EventTarget, type: string, modifiers: string[] | null, handler: EventHandler, scope: any): EventHandler {
	let filterModifiers = modifiers?.filter(m => !GLOBAL_EVENT_MODIFIERS.includes(m as any))

	return function wrappedHandler(e: Event) {
		if (filterModifiers && filterModifiers.length > 0) {
			let filterFn = EVENT_FILTERS[type as keyof typeof EVENT_FILTERS]
			if (!filterFn(e as any, filterModifiers)) {
				return
			}
		}

		if (modifiers && modifiers.includes('self') && e.target !== el) {
			return
		}

		if (modifiers && modifiers.includes('prevent')) {
			e.preventDefault()
		}

		if (modifiers && modifiers.includes('stop')) {
			e.stopPropagation()
		}

		if (modifiers && modifiers.includes('once')) {
			let capture = modifiers.includes('capture')
			DOMEvents.off(el, type as EventType, handler, scope, capture)
		}

		handler.call(scope, e)
	}
}


/** 
 * Unbind all event listeners that match specified parameters.
 * Note it equals to `DOMEvents.off`.
 */
export function off<T extends EventType>(el: EventTarget, type: T, handler: InferEventHandler<T>, scope: any = null) {
	DOMEvents.off(el, type, handler, scope)
}
