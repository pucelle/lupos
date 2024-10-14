import {factory, Helper, TemplateSlotPlaceholder, ts, VisitTree} from '../../../base'
import {BindingBase, BindingUpdateCallWith} from './base'
import {TrackingPatch} from '../../../ff'
import {getLatestBindingInfo, LatestBindingInfo} from './latest-binding'


export class RefBinding extends BindingBase {

	/** :ref=${access | variable}. */
	private useAccess: boolean = false

	/** Previous binding information. */
	private previousBinding: LatestBindingInfo | null = null

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

	init() {
		if (this.modifiers.includes('binding')) {
			this.previousBinding = getLatestBindingInfo(this.node)
		}
		
		this.initRef()
		super.init()
	}

	/** Init things for `:ref`. */
	private initRef() {
		let rawValueNode = this.slot.getFirstRawValueNode()
		let beComponent = TemplateSlotPlaceholder.isComponent(this.node.tagName!)

		// If declare property as `XXXElement`, force ref element.
		if (rawValueNode && beComponent) {
			let type = Helper.types.getType(rawValueNode)
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

	protected initParameterList() {
		if (!this.useAccess) {
			super.initParameterList()
		}

		// Apply the query parameter from referencing binding to current.
		if (!this.withQueryToken && this.previousBinding && this.previousBinding.queryParameter) {
			this.withQueryToken = true

			if (this.parameterList) {
				this.parameterList.unshift(this.previousBinding.queryParameter)
			}
			else if (this.slot.valueIndices) {
				this.parameterList = [this.previousBinding.queryParameter, this.slot.outputValue().joint]
			}
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
		if (this.previousBinding && this.useAccess) {
			callValue = factory.createFunctionExpression(
				undefined,
				undefined,
				factory.createIdentifier(''),
				undefined,
				[],
				undefined,
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createBinaryExpression(
							rawValueNode,
							factory.createToken(ts.SyntaxKind.EqualsToken),
							factory.createIdentifier(this.previousBinding.name)
						)),
						...Helper.pack.toStatements(TrackingPatch.outputIsolatedTracking(rawValueNode, 'set'))
					],
					false
				)
			)
		}

		// function(doRef){ this.refBinding.call(this, doRef ? previousBinding : null) }
		else if (this.previousBinding) {
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
									factory.createIdentifier(this.previousBinding.name),
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