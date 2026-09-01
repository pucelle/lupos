import ts from 'typescript'
import {createTransformSessionStateKey, Modifier, DeclarationScopeTree, transformSession, transformContext} from '../../core'
import {TreeParser} from './tree'
import {PairKeysMap} from '../../lupos-ts-module'


export namespace HTMLOutputHandler {

	const StateKey = createTransformSessionStateKey<PairKeysMap<string, boolean, string>>('HTMLOutputHandler')

	function getCache() {
		return transformSession.getState(StateKey, () => new PairKeysMap())
	}

	
	/** 
	 * Output html nodes from a tree parser.
	 * Returns html maker name.
	 */
	export function prepareOutput(tree: TreeParser, wrapped: boolean, htmlName: string):
		{name: string, output: () => void}
	{
		Modifier.addImport('HTMLMaker', 'lupos.html')

		let htmlString = tree.root.getContentHTMLString(tree.template, tree.template.analyzer)

		// Cache meet.
		let cache = getCache()
		if (cache.has(htmlString, wrapped)) {
			return {
				name: cache.get(htmlString, wrapped)!,
				output: () => {},
			}
		}

		// $html_0
		let parameters: ts.Expression[] = [transformContext.factory.createStringLiteral(htmlString)]

		// Template get wrapped.
		if (wrapped) {
			parameters.push(transformContext.factory.createTrue())
		}

		let htmlMaker = transformContext.factory.createNewExpression(
			transformContext.factory.createIdentifier('HTMLMaker'),
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
		let htmlNode = transformContext.factory.createVariableStatement(
			undefined,
			transformContext.factory.createVariableDeclarationList(
				[transformContext.factory.createVariableDeclaration(
					transformContext.factory.createIdentifier(htmlName),
					undefined,
					undefined,
					htmlMaker
				)],
				ts.NodeFlags.Const
			)
		)

		cache.set(htmlString, wrapped, htmlName)

		let output = () => {
			DeclarationScopeTree.getTopmost().addStatements([htmlNode], tree.index)
		}

		return {
			name: htmlName,
			output,
		}
	}
}
