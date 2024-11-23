import type TS from 'typescript'
import {factory, Packer, TemplateSlotPlaceholder, ts} from '../../../core'
import {Helper} from '../../../lupos-ts-module'
import {BindingBase, BindingUpdateCallWith} from './base'
import {TrackingPatch} from '../../../ff'
import {getLatestBindingInfo, LatestBindingInfo} from './latest-binding'


export class RefBinding extends BindingBase {

	/** :ref=${xxx}. */
	private useAccess: boolean = false

	/** :ref=${this.xxx}. */
	private useContextAccess: boolean = false

	/** :ref=${localVariable}. */
	private useLocalAccess: boolean = false

	/** Previous binding information. */
	private previousBindingInfo: LatestBindingInfo | null = null

	outputValue(asCallback: boolean = false) {

		// Ignore original ref value output and avoid output original access node.
		if (this.useAccess) {
			return {
				joint: factory.createNull(),
				valueNodes: [],
			}
		}

		else {
			return super.outputValue(asCallback)
		}
	}

	preInit() {
		if (this.modifiers.includes('binding')) {
			this.previousBindingInfo = getLatestBindingInfo(this.node)
		}
		
		this.initRef()
		super.preInit()
	}

	private getRawValueNode(): TS.Expression | undefined {
		let rawValueNode = this.slot.getFirstRawValueNode()

		// `a!` -> `a`
		if (rawValueNode && ts.isNonNullExpression(rawValueNode)) {
			rawValueNode = rawValueNode.expression
		}

		return rawValueNode
	}

	/** Init things for `:ref`. */
	private initRef() {
		let rawValueNode = this.getRawValueNode()
		let beComponent = TemplateSlotPlaceholder.isComponent(this.node.tagName!)

		// If declare property as `XXXElement`, force ref element.
		if (rawValueNode && beComponent) {
			let type = Helper.types.typeOf(rawValueNode)
			let typeText = Helper.types.getTypeFullText(type)

			if (/^\w*?Element$/.test(typeText)) {
				this.modifiers = ['el']
			}
		}

		// Become `com` or `el` ref.
		if (this.modifiers.length === 0) {
			if (beComponent) {
				this.modifiers = ['com']
			}
			else {
				this.modifiers = ['el']
			}
		}

		// Will be compiled as a function and become static.
		if (rawValueNode) {
			this.initAccessUsing(rawValueNode)
			
			if (this.useAccess) {
				TrackingPatch.ignore(rawValueNode)
			}
		}
	}

	private initAccessUsing(rawValueNode: TS.Expression) {
		if (!rawValueNode) {
			return
		}

		let bePropertyOrVariable = Helper.access.isAccess(rawValueNode)
				&& !!Helper.symbol.resolveDeclaration(rawValueNode, Helper.isPropertyLike)
			|| Helper.isVariableIdentifier(rawValueNode)
				&& !!Helper.symbol.resolveDeclaration(rawValueNode, ts.isVariableDeclaration)

		if (bePropertyOrVariable) {
			this.useAccess = true

			if (Helper.access.isAccess(rawValueNode)) {
				let topmost = Helper.access.getTopmost(rawValueNode)

				// `this.xxx.xxx`
				this.useContextAccess = Helper.isThis(topmost)
			}
	
			this.useLocalAccess = !this.useContextAccess
		}
	}

	protected initParameters() {
		super.initParameters()

		// Be overwritten by built expressions.
		if (this.useAccess) {
			this.parameterList = null
		}

		// Apply, but not overwrite the query parameter from referencing binding to current.
		if (!this.withQueryToken
			&& this.previousBindingInfo
			&& this.previousBindingInfo.queryParameter
		) {
			this.withQueryToken = true
			this.queryParameter = this.previousBindingInfo.queryParameter
		}
	}

	protected initLatestVariableNames() {
		if (!this.useAccess) {
			super.initLatestVariableNames()
		}
	}
	
	protected patchCallMethodAndValues(callWith: BindingUpdateCallWith): BindingUpdateCallWith {
		let rawValueNode = this.getRawValueNode()!
		let callValue = callWith.values[0]

		// this.refName ->
		// function(){ this.refName = previousBinding }
		if (this.previousBindingInfo && this.useAccess) {
			callValue = factory.createFunctionExpression(
				undefined,
				undefined,
				factory.createIdentifier(''),
				undefined,
				[factory.createParameterDeclaration(
					undefined,
					undefined,
					factory.createIdentifier('doRef'),
					undefined,
					undefined,
					undefined
				)],
				undefined,
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createBinaryExpression(
							rawValueNode,
							factory.createToken(ts.SyntaxKind.EqualsToken),
							factory.createConditionalExpression(
								factory.createIdentifier('doRef'),
								factory.createToken(ts.SyntaxKind.QuestionToken),
								factory.createIdentifier(this.previousBindingInfo.name),
								factory.createToken(ts.SyntaxKind.ColonToken),
								factory.createNull()
							)
						)),
						...Packer.toStatements(TrackingPatch.outputIsolatedTracking(rawValueNode, 'set'))
					],
					false
				)
			)
		}

		// function(doRef){ this.refBinding.call(this, doRef ? previousBinding : null) }
		else if (this.previousBindingInfo) {
			callValue = factory.createFunctionExpression(
				undefined,
				undefined,
				factory.createIdentifier(''),
				undefined,
				[factory.createParameterDeclaration(
					undefined,
					undefined,
					factory.createIdentifier('doRef'),
					undefined,
					undefined,
					undefined
				)],
				undefined,
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createCallExpression(
							factory.createPropertyAccessExpression(
								rawValueNode,
								factory.createIdentifier('call')
							),
							undefined,
							[
								factory.createThis(),
								factory.createConditionalExpression(
									factory.createIdentifier('doRef'),
									factory.createToken(ts.SyntaxKind.QuestionToken),
									factory.createIdentifier(this.previousBindingInfo.name),
									factory.createToken(ts.SyntaxKind.ColonToken),
									factory.createNull()
								)
							]
						))
					],
					false
				)
			)
		}

		// this.refName ->
		// function(refed){ this.refName = refed }
		else if (this.useAccess) {
			callValue = factory.createFunctionExpression(
				undefined,
				undefined,
				factory.createIdentifier(''),
				undefined,
				[factory.createParameterDeclaration(
					undefined,
					undefined,
					factory.createIdentifier('refed'),
					undefined,
					undefined,
					undefined
				)],
				undefined,
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createBinaryExpression(
							rawValueNode,
							factory.createToken(ts.SyntaxKind.EqualsToken),
							factory.createIdentifier('refed')
						)),
						...Packer.toStatements(TrackingPatch.outputIsolatedTracking(rawValueNode, 'set'))
					],
					false
				)
			)
		}

		// Output ref binding function as a dynamic value.
		if (this.useLocalAccess) {
			callValue = this.slot.outputCustomValue(callValue)
		}

		// () => {...}
		return {
			method: callWith.method,
			values: [callValue],
		}
	}
}