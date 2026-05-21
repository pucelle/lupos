import ts from 'typescript'
import {HTMLNode, LuposKnownInternalBindings} from '../../../lupos-ts-module'
import {PartType, TreeParser} from '../tree'
import {BindingSlotParser} from '../slots'
import {factory, Modifier, DeclarationScopeTree, helper} from '../../../core'
import {TemplateParser} from '../template'
import {VariableNames} from '../variable-names'
import {setLatestBindingInfo} from './latest-binding'


export interface BindingUpdateCallWith {
	method: string
	values: ts.Expression[]
}


export class BindingBase {

	readonly slot: BindingSlotParser
	readonly node: HTMLNode
	readonly tree: TreeParser
	readonly template: TemplateParser

	/** 
	 * Whether output update content as a lazy callback.
	 * So it will be wrapped as a callback and becomes always transferrable.
	 */
	readonly asLazyCallback: boolean = false

	name: string
	prefix: string
	modifiers: string[]

	/** `?:binding=value`, detach binding if value is `null` or `undefined`. */
	protected withQueryToken: boolean = false

	/** Binding constructor parameter count. */
	protected implementsPart: boolean = false

	/** Binding constructor parameter count. */
	protected bindingClassParameterCount: number | null = null

	/** $binding_0 */
	protected bindingVariableName: string = ''

	/** 
	 * After splitting like `:binding=${a, b}` or `:binding=${(a, b)}`.
	 * It doesn't include query value for optional binding like `?:binding=${a, b}`
	 */
	protected parameterList: ts.Expression[] | null = null
	
	/** $latest_0 */
	protected latestVariableNames: (string | null)[] | null = null

	/** $delegator_0 */
	protected delegatorVariableName: string | null = null

	/** Binding variable name of next `:ref.binding=...`. */
	protected refBindingVariableName: string | null = null

	constructor(slot: BindingSlotParser) {
		this.slot = slot
		this.node = slot.node
		this.tree = slot.tree
		this.template = slot.template

		this.name = slot.name
		this.prefix = slot.prefix!
		this.modifiers = this.slot.modifiers

		if (this.prefix.includes('?')) {
			this.withQueryToken = true
		}
	}

	/** 
	 * Get value node, either `$values[0]`, or `"..."`.
	 * Can only use it when outputting update.
	 */
	outputValue(): {
		joint: ts.Expression,
		valueNodes: ts.Expression[],
	} {

		// Output values from parameter list.
		if (this.parameterList) {
			let valueNodes = this.template.values.outputValueListOfIndex(this.parameterList, this.slot.valueIndices![0], this.tree, this.asLazyCallback)
			let joint = valueNodes[0]

			return {
				joint,
				valueNodes,
			}
		}
		else {
			return this.slot.outputValue()
		}
	}

	preInit() {
		this.initBindingClass()
		this.initParameters()
		this.initLatestVariableNames()

		// Mark as will applying `:html`.
		if (this.name === 'html') {
			this.node.setAttr('html', null)
		}

		// Use a delegator to delegate binding part because it may be deleted.
		// If have no following binding ref, no need to initialize a binding variable name.
		if (this.withQueryToken) {
			Modifier.addImport('PartDelegator', 'lupos.html')
			this.delegatorVariableName = this.tree.makeUniqueDelegatorName()
			this.tree.addPart(this.delegatorVariableName, this.node, PartType.Delegator)
		}
		else {
			this.bindingVariableName = this.tree.makeUniqueBindingName()

			if (this.implementsPart) {
				this.tree.addPart(this.bindingVariableName, this.node, PartType.Binding)
			}
		}
		
		// Communicate with next `:ref.binding`.
		setLatestBindingInfo(
			this.node,
			this.bindingVariableName,	// May be '' if will bind it dynamically by `PartDelegator`.
			(refBindingName: string) => {
				this.refBindingVariableName = refBindingName
			}
		)
	}

	postInit() {}

	/** Check binding class declaration. */
	private initBindingClass() {
		if (LuposKnownInternalBindings[this.name]) {
			let item = LuposKnownInternalBindings[this.name]
			
			// Add as a part.
			if (item.implementsPart) {
				this.implementsPart = true
			}

			// Import binding class.
			Modifier.addImport(item.name, 'lupos.html') 

			// Remember class parameter count.
			this.bindingClassParameterCount = item.parameterCount
		}

		else {

			// :bindingName -> bindingName
			let decl = DeclarationScopeTree.getReferenceByName(this.name, this.template.node)

			// `Import ClassBinding`
			// `class ClassBinding {...}`
			if (decl) {

				// Avoid been removed by typescript compiler.
				if (ts.isImportSpecifier(decl)) {
					Modifier.persistImport(decl)
				}

				let bindingClass = helper.symbol.resolveDeclaration(decl, ts.isClassDeclaration)!

				this.template.addRefedDeclaration(decl)

				if (bindingClass
					&& helper.class.isImplementedOf(bindingClass, 'Part', 'lupos.html')
				) {
					this.implementsPart = true
				}

				let bindingClassParams = bindingClass ? helper.class.getConstructorParameters(bindingClass, true) : null
				this.bindingClassParameterCount = bindingClassParams ? bindingClassParams.length : null
			}
		}
	}

	/** Initialize as list parameters, like `:bind=${(a, b)}` will be parsed as `[a, b]`. */
	protected initParameters() {
		if (this.slot.strings || !this.slot.valueIndices) {
			return
		}

		let parameters = this.splitToParameters()
		this.parameterList = parameters
	}

	/** 
	 * For binding parameter list like `:binding=${a, b}` or `:binding=${(a, b)}`,
	 * get nodes after splitting the parameters to a list.
	 * `valueIndices` must exist to call this.
	 */
	private splitToParameters(): ts.Expression[] {
		let rawValueNode = this.template.values.getRawValue(this.slot.valueIndices![0])

		if (ts.isParenthesizedExpression(rawValueNode)) {
			rawValueNode = rawValueNode.expression
		}

		let rawValueNodes = helper.pack.unPackCommaBinaryExpressions(rawValueNode)
		return rawValueNodes
	}

	/** Initialize latest variable names, must after `initParameterList`. */
	protected initLatestVariableNames() {
		if (this.parameterList) {
			this.latestVariableNames = this.slot.makeCustomGroupOfLatestNames(this.parameterList)
		}
		else {
			this.latestVariableNames = this.slot.makeGroupOfLatestNames()
		}

		// All be `null`.
		if (this.latestVariableNames && this.latestVariableNames.every(v => !v)) {
			this.latestVariableNames = null
		}
	}

	outputInit() {
		let nodeName = this.slot.getRefedNodeName()
		let bindingParamCount = this.bindingClassParameterCount

		let bindingClassName = LuposKnownInternalBindings[this.name]
			? LuposKnownInternalBindings[this.name].name
			: this.name

		let bindingParams: ts.Expression[] = [factory.createIdentifier(nodeName)]

		// Need `context` parameter
		if (bindingParamCount === null || bindingParamCount > 1) {
			bindingParams.push(factory.createIdentifier(VariableNames.context))
		}

		// Need `modifiers` parameter
		if (bindingParamCount === null || bindingParamCount > 2 && this.modifiers.length > 0) {
			bindingParams.push(factory.createArrayLiteralExpression(
				this.modifiers.map(m => factory.createStringLiteral(m)),
				false
			))
		}

		// new ClassBinding($node_0, ?context, ?modifiers)
		let newBinding = factory.createNewExpression(
			factory.createIdentifier(bindingClassName),
			undefined,
			bindingParams
		)


		// Output contents.
		let init: (ts.Statement | ts.Expression)[] = []

		// let $binding_0
		// () => new ClassBinding($node_0, ?context, ?modifiers)
		if (this.withQueryToken) {

			// `() => new ClassBinding($node_0, ?context, ?modifiers)` for `PartDelegator` param.
			let bindingInitFn = factory.createArrowFunction(
				undefined,
				undefined,
				[],
				undefined,
				factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
				newBinding
			)

			// () => (binding) => {$ref_0.setRefValue(binding)}
			let refOnUpdated: ts.ArrowFunction | null = null

			if (this.refBindingVariableName) {

				// () => (binding) => {$ref_0.setRefValue(binding)}
				refOnUpdated = factory.createArrowFunction(
					undefined,
					undefined,
					[factory.createParameterDeclaration(
						undefined,
						undefined,
						factory.createIdentifier('binding'),
						undefined,
						undefined,
						undefined
					)],
					undefined,
					factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
					factory.createBlock(
						[
							factory.createExpressionStatement(factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createIdentifier(this.refBindingVariableName!),
									factory.createIdentifier('setRefValue')
								),
								undefined,
								[
									factory.createIdentifier('binding')
								]
							))
						],
						false
					)
				)
			}
			
			// let $delegator_0 = new PartDelegator(...)
			let delegatorPart = this.slot.createVariableAssignment(
				this.delegatorVariableName!,
				factory.createNewExpression(
					factory.createIdentifier('PartDelegator'),
					undefined,
					[
						bindingInitFn,
						...(refOnUpdated ? [refOnUpdated] : [])
					]
				)
			)

			init.push(delegatorPart)
		}

		// let $binding_0 = new ClassBinding($node_0, ?context, ?modifiers)
		else {
			let bindingInit = this.slot.createVariableAssignment(
				this.bindingVariableName,
				newBinding
			)

			init.push(bindingInit)
		}

		return init
	}

	outputUpdate() {
		let values = this.outputValue()

		let callMethod = 'update'
		let callValues = this.parameterList ? values.valueNodes : [values.joint]
		let callWith = this.patchCallMethodAndValues({method: callMethod, values: callValues})
		callMethod = callWith.method
		callValues = callWith.values

		let update: ts.Statement | ts.Expression

		// if ($latest_0 !== $values[0]) {
		//   ($delegator_0 or $binding_0).callMethod(callValue)
		//   $latest_0 = $values[0]
		// }
		if (this.latestVariableNames) {
			update = factory.createIfStatement(
				this.slot.outputLatestComparison(this.latestVariableNames, values.valueNodes),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier(this.delegatorVariableName || this.bindingVariableName),
								factory.createIdentifier(callMethod)
							),
							undefined,
							callValues
						)),
						...this.slot.outputLatestAssignments(this.latestVariableNames, values.valueNodes),
					],
					true
				),
				undefined
			)
		}

		// $binding_0.update($values[0])
		else {
			update = factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(this.bindingVariableName),
					factory.createIdentifier(callMethod)
				),
				undefined,
				callValues
			)
		}

		return update
	}

	/** To patch update call method and values. */
	protected patchCallMethodAndValues(callWith: BindingUpdateCallWith): BindingUpdateCallWith {
		return callWith
	}
}