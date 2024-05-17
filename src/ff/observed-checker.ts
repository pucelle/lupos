import type * as ts from 'typescript'
import {TSHelper} from '../base/ts-helper'


/** Help to check observed state. */
export class ObservedChecker {

	readonly helper: TSHelper
	readonly ts: typeof ts

	constructor(helper: TSHelper) {
		this.helper = helper
		this.ts = helper.ts
	}

	/** Whether type node is an observed type. */
	isTypeNodeObserved(node: ts.TypeNode): boolean {

		// `Observed<>`, must use it directly, type extending is now working.
		if (this.helper.isTypeImportedFrom(node, 'Observed', '@pucelle/ff')) {
			return true
		}

		// `Component` like.
		else {
			let clsDecl = this.helper.resolveOneDeclaration(node, this.ts.isClassDeclaration)
			if (clsDecl && this.helper.isClassImplemented(clsDecl, 'Observed', '@pucelle/ff')) {
				return true 
			}
		}

		return false
	}

	/** Whether type node is an observed type. */
	isVariableDeclarationObserved(node: ts.VariableDeclaration): boolean {

		// `var a = {b:1} as Observed<{b: number}>`, observed.
		// `var a: Observed<{b: number}> = {b:1}`, observed.
		// Note here: `Observed` must appear directly, reference or alias is not working.

		let type = node.type 
		if (!type && node.initializer && this.ts.isAsExpression(node.initializer)) {
			type = node.initializer.type
		}

		if (type && this.helper.isTypeImportedFrom(type, 'Observed', '@pucelle/ff')) {
			return true
		}

		return false
	}

	/** Returns whether be an identifier, this, or a property accessing. */
	canBeObserved(node: ts.Node): 
		node is ts.PropertyAccessExpression | ts.ElementAccessExpression | ts.Identifier | ts.ThisExpression
	{
		return this.ts.isPropertyAccessExpression(node)
			|| this.ts.isElementAccessExpression(node)
			|| node.kind === this.ts.SyntaxKind.ThisKeyword
			|| this.ts.isIdentifier(node)
	}
}