import {SlotParserBase} from './base'
import {factory, ts} from '../../../../base'
import {VariableNames} from '../variable-names'
import {cleanList} from '../../../../utils'


export class TemplateAttributeSlotParser extends SlotParserBase {

	/** Attribute name. */
	declare readonly name: string

	/** Attribute value. */
	declare readonly strings: [string]

	/** Has no value index related. */
	declare readonly valueIndices: null

	outputInit() {
		let string = this.strings[0]

		// class="..."
		if (this.name === 'class') {
			let classNames = cleanList(string.split(/\s+/))

			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createPropertyAccessExpression(
					factory.createPropertyAccessExpression(
						factory.createIdentifier(VariableNames.context),
						factory.createIdentifier('el')
					),
					factory.createIdentifier('classList')
					),
					factory.createIdentifier('add')
				),
				undefined,
				classNames.map(n => factory.createStringLiteral(n))
			)
		}

		// style="..."
		else if (this.name === 'style') {
			let styles = string.split(/\s*;\s*/)
				.map(v => v.split(/\s*:\s*/))
				.filter(v => v[0])

			let styleNode = factory.createPropertyAccessExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(VariableNames.context),
					factory.createIdentifier('el')
				),
				factory.createIdentifier('style')
			)
			
			return styles.map(([name, value]) => {
				if (name.includes('-')) {
					return factory.createBinaryExpression(
						factory.createElementAccessExpression(
							styleNode,
							factory.createStringLiteral(name)
						),
						factory.createToken(ts.SyntaxKind.EqualsToken),
						factory.createStringLiteral(value || '')
					)
				}
				else {
					return factory.createBinaryExpression(
						factory.createPropertyAccessExpression(
							styleNode,
							factory.createIdentifier(name)
						),
						factory.createToken(ts.SyntaxKind.EqualsToken),
						factory.createStringLiteral(value || '')
					)
				}
			})
		}

		// attr="..."
		else {
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createPropertyAccessExpression(
						factory.createIdentifier(VariableNames.context),
						factory.createIdentifier('el')
					),
					factory.createIdentifier('setAttribute')
				),
				undefined,
				[
				  	factory.createStringLiteral(this.name),
				  	factory.createStringLiteral(string)
				]
			) 
		}
	}
}