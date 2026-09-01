import ts from 'typescript'
import {Packer, transformContext} from '../../../core'
import {BindingBase, BindingUpdateCallWith} from './base'
import {ObservedChecker, TrackingPatch} from '../../../lupos'
import {getLatestBindingInfo, LatestBindingInfo} from './latest-binding'
import {TemplateSlotPlaceholder} from '../../../lupos-ts-module'


export class RefBinding extends BindingBase {
	
	override readonly asLazyCallback: boolean = true

	/** :ref=${xxx}. */
	private usePropAccess: boolean = false

	/** :ref=${this.xxx}. */
	private useContextPropAccess: boolean = false

	/** :ref=${localVariable}. */
	private useLocalPropAccess: boolean = false

	/** Previous binding information. */
	private previousBindingInfo: LatestBindingInfo | null = null

	/** Treat as lazy callback. */
	override outputValue() {

		// Ignore original ref value output and avoid output original access node.
		if (this.usePropAccess) {
			return {
				joint: transformContext.factory.createNull(),
				valueNodes: [],
			}
		}

		else {
			return super.outputValue()
		}
	}

	override preInit() {
		if (this.modifiers.includes('binding')) {
			this.previousBindingInfo = getLatestBindingInfo(this.node)
		}

		this.initRef()
		super.preInit()

		if (this.previousBindingInfo) {
			this.previousBindingInfo.setRefBindingName(this.bindingVariableName)
		}
	}

	private getRawValueNode(): ts.Expression | undefined {
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
			let type = transformContext.helper.types.typeOf(rawValueNode)
			let typeText = transformContext.helper.types.getTypeFullText(type)

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
			
			if (this.usePropAccess
				&& transformContext.helper.access.isAccess(rawValueNode)
				&& ObservedChecker.getSelfObserved(rawValueNode)
			) {
				TrackingPatch.ignore(rawValueNode)

				// Not truly output because of been ignored, to avoid eliminating private get only tracking.
				TrackingPatch.addCustomTracking(rawValueNode, 'set')
			}
		}
	}

	private initAccessUsing(rawValueNode: ts.Expression) {
		if (!rawValueNode) {
			return
		}

		let bePropertyOrVariable = transformContext.helper.access.isAccess(rawValueNode)
				&& !!transformContext.helper.symbol.resolveDeclaration(rawValueNode, transformContext.helper.isPropertyLike)
			|| transformContext.helper.isVariableIdentifier(rawValueNode)
				&& !!transformContext.helper.symbol.resolveDeclaration(rawValueNode, ts.isVariableDeclaration)

		if (bePropertyOrVariable) {
			this.usePropAccess = true

			if (transformContext.helper.access.isAccess(rawValueNode)) {
				let topmost = transformContext.helper.access.getTopmost(rawValueNode)

				// `this.xxx.xxx`
				this.useContextPropAccess = transformContext.helper.isThis(topmost)
			}
	
			this.useLocalPropAccess = !this.useContextPropAccess
		}
	}

	protected override initParameters() {
		super.initParameters()

		// Be overwritten by built expressions.
		if (this.usePropAccess) {
			this.parameterList = null
		}
	}

	protected override initLatestVariableNames() {
		if (!this.usePropAccess) {
			super.initLatestVariableNames()
		}
	}

	override outputInit() {
		let init = super.outputInit()

		// $ref_0.setRefValue(binding)
		if (this.previousBindingInfo && this.previousBindingInfo.name) {
			let setRefValue = transformContext.factory.createExpressionStatement(transformContext.factory.createCallExpression(
				transformContext.factory.createPropertyAccessExpression(
					transformContext.factory.createIdentifier(this.bindingVariableName),
					transformContext.factory.createIdentifier('setRefValue')
				),
				undefined,
				[
					transformContext.factory.createIdentifier(this.previousBindingInfo.name)
				]
			))

			init.push(setRefValue)
		}

		return init
	}
	
	protected override patchCallMethodAndValues(callWith: BindingUpdateCallWith): BindingUpdateCallWith {
		let rawValueNode = this.getRawValueNode()!
		let callValue = callWith.values[0]

		// this.refName ->
		// function(refed){ this.refName = refed }
		if (this.usePropAccess) {
			callValue = transformContext.factory.createFunctionExpression(
				undefined,
				undefined,
				transformContext.factory.createIdentifier(''),
				undefined,
				[transformContext.factory.createParameterDeclaration(
					undefined,
					undefined,
					transformContext.factory.createIdentifier('refed'),
					undefined,
					undefined,
					undefined
				)],
				undefined,
				transformContext.factory.createBlock(
					[
						transformContext.factory.createExpressionStatement(transformContext.factory.createBinaryExpression(
							rawValueNode,
							transformContext.factory.createToken(ts.SyntaxKind.EqualsToken),
							transformContext.factory.createIdentifier('refed')
						)),
						...Packer.toStatements(TrackingPatch.outputIsolatedTracking(rawValueNode, 'set'))
					],
					true
				)
			)
		}

		// Output ref binding function as a dynamic value.
		if (this.useLocalPropAccess) {
			callValue = this.slot.outputCustomValue(callValue)
		}

		// () => {...}
		return {
			method: callWith.method,
			values: [callValue],
		}
	}
}