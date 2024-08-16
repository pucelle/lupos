import type TS from 'typescript'
import {definePreVisitCallback, factory, Modifier, ts} from '../../../base'
import {TreeParser} from './tree'
import {DoubleKeysMap} from '../../../utils'
import {VariableNames} from './variable-names'


export namespace HTMLOutputHandler {

	const Cache: DoubleKeysMap<string, boolean, string> = new DoubleKeysMap()


	/** Initialize before loading each new source file. */
	export function initialize() {
		Cache.clear()
	}

	
	/** 
	 * Output html nodes from a tree parser.
	 * Returns html maker name.
	 */
	export function output(parser: TreeParser, wrapped: boolean): string {
		Modifier.addImport('HTMLMaker', '@pucelle/lupos.js')

		let htmlString = parser.tree.getContentString()

		// Cache meet.
		if (Cache.has(htmlString, wrapped)) {
			return Cache.get(htmlString, wrapped)!
		}

		// $html_0
		let htmlName = VariableNames.getUniqueName(VariableNames.html)
		let parameters: TS.Expression[] = [factory.createStringLiteral(htmlString)]

		// Template get wrapped.
		if (wrapped) {
			parameters.push(factory.createTrue())
		}
		
		// const $html_0 = new HTMLMaker('...', wrapped)
		let htmlNode = factory.createVariableStatement(
			undefined,
			factory.createVariableDeclarationList(
				[factory.createVariableDeclaration(
					factory.createIdentifier(htmlName),
					undefined,
					undefined,
					factory.createNewExpression(
						factory.createIdentifier('HTMLMaker'),
						undefined,
						parameters
					)
				)],
				ts.NodeFlags.Const
			)
		)

		Modifier.addTopmostDeclarations(htmlNode)
		Cache.set(htmlString, wrapped, htmlName)

		return htmlName
	}
}


definePreVisitCallback(HTMLOutputHandler.initialize)