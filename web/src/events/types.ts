/** 
 * All event types.
 * Includes customized transition enter and leave events.
 */
export type EventType = keyof GlobalEventHandlersEventMap | keyof WindowEventHandlersEventMap
	| 'transition-enter-started' | 'transition-enter-ended'
	| 'transition-leave-started' | 'transition-leave-ended'

/** Infer event handler by event type. */
export type InferEventHandler<T extends EventType> = (e: InferEventParameter<T>) => void

/** Infer event parameter by event type. */
export type InferEventParameter<T extends EventType> = T extends keyof GlobalEventHandlersEventMap | keyof WindowEventHandlersEventMap
	? (GlobalEventHandlersEventMap & WindowEventHandlersEventMap)[T]
	: any
