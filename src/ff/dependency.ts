import type * as ts from 'typescript'
import {SourceFileModifier, TSHelper, defineVisitor, isComponent} from '../base'


/*
When to track dependencies :
- 1. Track codes inside of `@observable` class range, and all of it's sub properties.
- 2. Track variables of `Observed<>` type, and all of it's sub properties.
- 3. Exclude tracking of readonly types, like `readonly` modifier, `Readonly<>`, `ReadonlyArray<>`, `DeepReadonly<>`
*/
defineVisitor(

	// Be derived class of `Component`.
	// May switch to match `render` method?
	(node: ts.Node, helper: TSHelper) => {
		return helper.ts.isSourceFile(node)
			|| helper.ts.isMethodDeclaration(node)
			|| helper.ts.isFunctionDeclaration(node)
	},
	(node: ts.ClassDeclaration, helper: TSHelper, modifier: SourceFileModifier) => {
		return node
	},
)
