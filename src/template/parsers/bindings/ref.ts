import {factory, Helper, TemplateSlotPlaceholder, ts, VisitTree} from '../../../base'
import {BindingBase, BindingUpdateCallWith} from './base'
import {TrackingPatch} from '../../../ff'
import {getLatestBindingInfo, LatestBindingInfo} from './latest-binding'


export class RefBinding extends BindingBase {

	/** :ref=${access | variable}. */
	private useAccess: boolean = false

	/** Previous binding information. */
	private previousBindingInfo: LatestBindingInfo | null = null

	outputValue(forceStatic: boolean = false) {

		// Ignore original ref value output.
		if (this.useAccess) {
			return {
				joint: factory.createNull(),
				valueNodes: [],
			}
		}

		else {
			return super.outputValue(forceStatic)
		}
	}

	preInit() {
		if (this.modifiers.includes('binding')) {
			this.previousBindingInfo = getLatestBindingInfo(this.node)
		}
		
		this.initRef()
		super.preInit()
	}

	/** Init things for `:ref`. */
	private initRef() {
		let rawValueNode = this.slot.getFirstRawValueNode()
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
		if (rawValueNode &&
			(Helper.access.isAccess(rawValueNode)
				&& Helper.symbol.resolveDeclaration(rawValueNode, Helper.isPropertyLike)
				|| Helper.variable.isVariableIdentifier(rawValueNode)
			)
		) {
			this.useAccess = true
			TrackingPatch.ignore(VisitTree.getIndex(rawValueNode))
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
		let rawValueNode = this.slot.getFirstRawValueNode()!
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
						...Helper.pack.toStatements(TrackingPatch.outputIsolatedTracking(rawValueNode, 'set'))
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
						...Helper.pack.toStatements(TrackingPatch.outputIsolatedTracking(rawValueNode, 'set'))
					],
					false
				)
			)
		}

		// () => {...}
		return {
			method: callWith.method,
			values: [callValue],
		}
	}
}