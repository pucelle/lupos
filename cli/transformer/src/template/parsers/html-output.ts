import * as ts from 'typescript'
import {definePreVisitCallback, factory, Modifier, DeclarationScopeTree} from '../../core'
import {TreeParser} from './tree'
import {PairKeysMap} from '../../lupos-ts-module'


export namespace HTMLOutputHandler {

	const Cache: PairKeysMap<string, boolean, string> = new PairKeysMap()


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
		Modifier.addImport('HTMLMaker', 'lupos.html')

		let htmlString = tree.root.getContentHTMLString()

		// Cache meet.
		if (Cache.has(htmlString, wrapped)) {
			return {
				name: Cache.get(htmlString, wrapped)!,
				output: () => {},
			}
		}

		// $html_0
		let parameters: ts.Expression[] = [factory.createStringLiteral(htmlString)]

		// Template get wrapped.
		if (wrapped) {
			parameters.push(factory.createTrue())
		}

		let htmlMaker = factory.createNewExpression(
			factory.createIdentifier('HTMLMaker'),
			undefined,
			parameters
		)

		// For tree shaking.
		ts.setSyntheticLeadingComments(htmlMaker, [
			{
				text: "#__PURE__",
				kind: ts.SyntaxKind.MultiLineCommentTrivia,
				pos: -1,
				end: -1,
				hasTrailingNewLine: false,
			}
		])
		
		// const $html_0 = new HTMLMaker('...', wrapped)
		let htmlNode = factory.createVariableStatement(
			undefined,
			factory.createVariableDeclarationList(
				[factory.createVariableDeclaration(
					factory.createIdentifier(htmlName),
					undefined,
					undefined,
					htmlMaker
				)],
				ts.NodeFlags.Const
			)
		)

		Cache.set(htmlString, wrapped, htmlName)

		let output = () => {
			DeclarationScopeTree.getTopmost().addStatements([htmlNode], tree.index)
		}

		return {
			name: htmlName,
			output,
		}
	}
}


definePreVisitCallback(HTMLOutputHandler.initialize)