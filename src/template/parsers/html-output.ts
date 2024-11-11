import type TS from 'typescript'
import {definePreVisitCallback, factory, Modifier, ScopeTree, ts} from '../../core'
import {TreeParser} from './tree'
import {DoubleKeysMap} from '../../utils'


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
	export function prepareOutput(tree: TreeParser, wrapped: boolean, htmlName: string):
		{name: string, output: () => void}
	{
		Modifier.addImport('HTMLMaker', '@pucelle/lupos.js')

		let htmlString = tree.root.getContentString()

		// Cache meet.
		if (Cache.has(htmlString, wrapped)) {
			return {
				name: Cache.get(htmlString, wrapped)!,
				output: () => {},
			}
		}

		// $html_0
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

		Cache.set(htmlString, wrapped, htmlName)

		let output = () => {
			ScopeTree.getTopmost().addStatements([htmlNode], tree.index)
		}

		return {
			name: htmlName,
			output,
		}
	}
}


definePreVisitCallback(HTMLOutputHandler.initialize)