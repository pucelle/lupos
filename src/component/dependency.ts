import type * as ts from 'typescript'
import {SourceFileModifier, TSHelper, defineVisitor, isComponent} from '../base'


/*
Get Dependencies tracking:
1. Analysis codes in `render` method, and all it referenced methods
2. Analysis codes also in computed and effect, watch property methods, and `addGlobalStyle(...)`.
3. If a method will be called in `render` method by derived class, how? avoid it.

4. Broadcast Mechanism:
	a. `this` is observable, `this.a` is too, and `this.a.b`.
	b. if cache a variable `var a = this.a`, must mark it as observable.
	c. a local context call, like `this.list.map(item => ...)`, `item` becomes observable.
	    this is hard to detect which parameter it should broadcast to.
		May only easily check each parameter, and if it extends object, then identify as observable?
	d. `this.method(this.prop)`, broadcast observable to the first parameter of this method.

	E.g.
	- `this.list.map(item => ...)`: can detect.
	- `this.list.map(item => this.renderItem(item))`: can detect.
	- `fn = (item) => {...}; this.list.map(fn)`: can detect.
	- `getProperty(this.object, 'property)`: cant detect, avoid this.
	- `this.getProperty(this.object, 'property)`: can detect, but still not suggest.
	       if `getProperty` is a common used method, not for render only? ignore.
	- `overwritten renderRow(item)`, and about original `renderRow` only know it's type.

Set Dependencies tracking:
1. Analysis codes anywhere
*/
defineVisitor(

	// Be derived class of `Component`.
	// May switch to match `render` method?
	(node: ts.Node, helper: TSHelper) => {
		if (!helper.ts.isClassDeclaration(node)) {
			return false
		}

		return isComponent()
	},
	(node: ts.ClassDeclaration, helper: TSHelper, modifier: SourceFileModifier) => {
		return node
	},
)
