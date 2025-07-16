/** 
 * `Observed` means we are observing this object, and can track all the
 * mutations of it's properties, and sub properties.
 * 
 * You may declare a variable / property / parameter as `Observed<...>` type,
 * or use as expression `a as Observed<...>`,
 * or make a class declaration implements `Observed`,
 * or make a type parameter extends `Observed<...>`.
 * 
 * Code must be compiled by `@pucelle/lupos.compiler` to work.
 */
export type Observed<T extends object = object> = T


/** 
 * `UnObserved` means we will stop observe this object.
 * 
 * You may declare a variable / property / parameter as `UnObserved<...>` type,
 * or use as expression `a as UnObserved<...>`,
 * or make a class declaration implements `UnObserved` to overwrite super,
 * or make a type parameter extends `UnObserved<...>`.
 */
export type UnObserved<T extends object = object> = T



/** 
 * It a class implements `MethodsObserved<GetNames, SetNames>`, it indicates which
 * methods cause elements of current class getting and setting actions.
 * This make a class works like a `Map` or `Set` to do elements get and set tracking.
 * 
 * To make it work, you should also ensure the class instance is `Observed`.
 * 
 * Note this type doesn't affect compiling of implemented class,
 * but affect the compiling of the places where use the class instance.
 */
export type MethodsObserved<GetMethods, SetMethods>
	= {[K in (GetMethods extends string ? GetMethods : never) | (SetMethods extends string ? SetMethods : never)]: Function}



/** 
 * It a parameter is of type `ParameterGetObserved<>`, it indicates that
 * the implementation will get elements of this parameter.
 * 
 * To make it work, you should also ensure the argument you pass is `Observed`.
 * 
 * Note this type doesn't affect compiling of the function declaration,
 * but affect the compiling of the places where use this function.
 */
export type ParameterGetObserved<T extends object = object> = T

/** 
* It a parameter is of type `ParameterSetObserved<>`, it indicates that
 * the implementation will set elements of this parameter.
 * 
 * To make it work, you should also ensure the argument you pass is `Observed`.
 * 
 * Note this type doesn't affect compiling of the function declaration,
 * but affect the compiling of the places where use this function.
 */
export type ParameterSetObserved<T extends object = object> = T