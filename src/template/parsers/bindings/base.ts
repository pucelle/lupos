import type TS from 'typescript'
import {HTMLNode} from '../../html-syntax'
import {TreeParser} from '../tree'
import {BindingSlotParser} from '../slots'
import {factory, Helper, Modifier, MutableMask, ScopeTree, ts} from '../../../base'
import {TemplateParser} from '../template'
import {VariableNames} from '../variable-names'
import {setLatestBindingInfo} from './latest-binding'


export interface BindingUpdateCallWith {
	method: string
	values: TS.Expression[]
}


/** Known bindings existing in `lupos.js`. */
export const KnownInternalBindings: Record<string, {name: string, parameterCount: number, implementsPart: boolean}> = {
	class: {name: 'ClassBinding', parameterCount: 1, implementsPart: false},
	html: {name: 'HTMLBinding', parameterCount: 1, implementsPart: false},
	ref: {name: 'RefBinding', parameterCount: 3, implementsPart: true},
	slot: {name: 'SlotBinding', parameterCount: 1, implementsPart: true},
	style: {name: 'StyleBinding', parameterCount: 1, implementsPart: false},
	transition: {name: 'TransitionBinding', parameterCount: 3, implementsPart: true},
}


export class BindingBase {

	readonly slot: BindingSlotParser
	readonly node: HTMLNode
	readonly tree: TreeParser
	readonly template: TemplateParser

	name: string
	modifiers: string[]

	/** `:?binding=value`, detach binding if value is `null` or `undefined`. */
	protected withQueryToken: boolean = false

	/** Binding constructor parameter count. */
	protected implementsPart: boolean = false

	/** Binding constructor parameter count. */
	protected bindingClassParameterCount: number | null = null

	/** $binding_0 */
	protected bindingVariableName: string = ''

	/** 
	 * After splitting like `:binding=${a, b}` or `:binding=${(a, b)}`.
	 * It includes query value for `:?binding=${a, b}`
	 */
	protected parameterList: TS.Expression[] | null = null
	
	/** $latest_0 */
	protected latestVariableNames: (string | null)[] | null = null

	/** $delegator_0 */
	protected delegatorVariableName: string | null = null

	constructor(slot: BindingSlotParser) {
		this.slot = slot
		this.node = slot.node
		this.tree = slot.tree
		this.template = slot.template

		this.name = slot.name
		this.modifiers = this.slot.modifiers

		if (this.name.startsWith('?')) {
			this.name = this.name.slice(1)
			this.withQueryToken = true
		}
	}

	/** 
	 * Get value node, either `$values[0]`, or `"..."`.
	 * Can only use it when outputting update.
	 */
	outputValue(forceStatic: boolean = false): {
		joint: TS.Expression,
		valueNodes: TS.Expression[],
	} {

		// Output values from parameter list.
		if (this.parameterList) {
			let valueNodes = this.template.values.outputValueAsParameterList(this.parameterList, this.slot.valueIndices![0])
			let joint = valueNodes[0]

			if (this.withQueryToken) {
				joint = valueNodes[1] ?? factory.createIdentifier('undefined')
			}

			return {
				joint,
				valueNodes,
			}
		}
		else {
			return this.slot.outputValue(forceStatic)
		}
	}

	init() {
		this.initBindingClass()
		this.initParameterList()
		this.initLatestVariableNames()
		this.bindingVariableName = this.tree.makeUniqueBindingName()

		// Use a delegator to delegate binding part because it may be deleted.
		if (this.withQueryToken) {
			Modifier.addImport('PartDelegator', '@pucelle/lupos.js')
			this.delegatorVariableName = this.tree.makeUniqueDelegatorName()

			if (this.implementsPart) {
				this.tree.addPart(this.delegatorVariableName, this.node)
			}
		}
		else if (this.implementsPart) {
			this.tree.addPart(this.bindingVariableName, this.node)
		}

		let queryParameter = this.withQueryToken && this.parameterList ? this.parameterList[0] ?? null : null
		setLatestBindingInfo(this.node, this.bindingVariableName, queryParameter)
	}

	/** Check binding class declaration. */
	private initBindingClass() {
		if (KnownInternalBindings[this.name]) {
			let item = KnownInternalBindings[this.name]
			
			// Add as a part.
			if (item.implementsPart) {
				this.implementsPart = true
			}

			// Import binding class.
			Modifier.addImport(item.name, '@pucelle/lupos.js') 

			// Remember class parameter count.
			this.bindingClassParameterCount = item.parameterCount
		}

		else {

			// :bindingName -> bindingName
			let decl = ScopeTree.getDeclarationByName(this.name, this.template.rawNode)

			// `Import ClassBinding`
			// `class ClassBinding {...}`
			if (!decl
				|| (
					!ts.isImportSpecifier(decl)
					&& !(ts.isClassDeclaration(decl))
				)
				|| !decl.name
			) {
				throw new Error(`Please make sure to import or declare "${this.name}"!`)
			}

			// Avoid been removed by typescript compiler.
			if (ts.isImportSpecifier(decl)) {
				Modifier.persistImport(decl)
			}

			let bindingModuleName = Helper.symbol.resolveImport(decl)
			let bindingClass = Helper.symbol.resolveDeclaration(decl, ts.isClassDeclaration)!

			this.template.addRefedDeclaration(decl)

			if (bindingClass
				&& Helper.cls.isImplemented(bindingClass, 'Part', '@pucelle/lupos.js', bindingModuleName?.moduleName)
			) {
				this.implementsPart = true
			}

			let bindingClassParams = bindingClass ? Helper.cls.getConstructorParameters(bindingClass) : null
			this.bindingClassParameterCount = bindingClassParams ? bindingClassParams.length : null
		}
	}

	/** Initialize as list parameters, like `:bind=${a, b}` will be parsed as `[a, b]`. */
	protected initParameterList() {
		if (!this.slot.strings && this.slot.valueIndices) {
			this.parameterList = this.getRawParameterList()
		}
	}

	/** 
	 * For binding parameter list like `:binding=${a, b}` or `:binding=${(a, b)}`,
	 * get nodes after splitting the parameters to a list.
	 * `valueIndices` must exist to get this list.
	 */
	private getRawParameterList(): TS.Expression[] {
		let rawValueNode = this.template.values.getRawValue(this.slot.valueIndices![0])

		if (ts.isParenthesizedExpression(rawValueNode)) {
			rawValueNode = rawValueNode.expression
		}

		let rawValueNodes = Helper.pack.unBundleCommaBinaryExpressions(rawValueNode)
		return rawValueNodes
	}

	/** Initialize latest variable names, must after `initParameterList`. */
	protected initLatestVariableNames() {
		if (this.slot.isAnyValueMutable()) {
			if (this.parameterList) {
				this.latestVariableNames = this.makeGroupOfParameterLatestNames()
			}
			else {
				this.latestVariableNames = this.slot.makeGroupOfLatestNames()
			}
		}
	}

	/** 
	 * Get a group of latest names for parameter list.
	 * `parameterList` must exist to get this list.
	 */
	private makeGroupOfParameterLatestNames(): (string | null)[] {
		let hashes: string[] = []

		let names = this.parameterList!.map((exp, index) => {
			if ((ScopeTree.testMutable(exp) & MutableMask.Mutable) === 0) {
				return null
			}

			// If first parameter use for querying, ignore.
			if (!this.withQueryToken || index > 0) {
				let hash = ScopeTree.hashNode(exp).name
				if (hashes.includes(hash)) {
					return null
				}

				hashes.push(hash)
			}

			return this.tree.makeUniqueLatestName()
		})

		return names
	}

	outputInit() {
		let nodeName = this.slot.getRefedNodeName()
		let bindingParamCount = this.bindingClassParameterCount

		let bindingClassName = KnownInternalBindings[this.name]
			? KnownInternalBindings[this.name].name
			: this.name

		let bindingParams: TS.Expression[] = [factory.createIdentifier(nodeName)]

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

		// let $binding_0 = new ClassBinding($node_0, ?context, ?modifiers)
		let bindingInit = this.slot.createVariableAssignment(
			this.bindingVariableName,
			factory.createNewExpression(
				factory.createIdentifier(bindingClassName),
				undefined,
				bindingParams
			)
		)

		let init = [bindingInit]


		// let $delegator_0 = new PartDelegator()
		if (this.delegatorVariableName) {
			let delegatorPart = this.slot.createVariableAssignment(
				this.delegatorVariableName,
				factory.createNewExpression(
					factory.createIdentifier('PartDelegator'),
					undefined,
					[]
				)
			)

			init.push(delegatorPart)
		}

		return init
	}

	outputUpdate() {
		let values = this.outputValue()
		let queryValue: TS.Expression | null = null
		let paramValuesJoint = this.parameterList ? values.valueNodes : [values.joint]
		let paramValueNodes = this.parameterList ? values.valueNodes : values.valueNodes
		let latestQueryParamVariableName = null
		let latestParamVariableNames = this.latestVariableNames

		if (this.withQueryToken) {
			queryValue = paramValuesJoint[0]
			paramValuesJoint = paramValuesJoint.slice(1)
			latestQueryParamVariableName = this.latestVariableNames?.[0] ?? null
			latestParamVariableNames = this.latestVariableNames?.slice(1) ?? null

			// May have no names after excluding query parameter.
			if (latestParamVariableNames &&
				(latestParamVariableNames.length === 0
					|| !latestParamVariableNames.some(v => v !== null)
				)
			) {
				latestParamVariableNames = null
			}
		}

		let callWith: BindingUpdateCallWith = {method: 'update', values: paramValuesJoint}
		callWith = this.patchCallMethodAndValues(callWith)

		let callMethod = callWith.method
		let callValues = callWith.values
		let update: TS.Statement | TS.Expression

		// if ($latest_0 !== $values[0]) {
		//   $binding_0.callMethod(callValue)
		//   $latest_0 = $values[0]
		// }
		if (latestParamVariableNames) {
			update = factory.createIfStatement(
				this.slot.outputLatestComparison(latestParamVariableNames, paramValueNodes),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier(this.bindingVariableName),
								factory.createIdentifier(callMethod)
							),
							undefined,
							callValues
						)),
						...this.slot.outputLatestAssignments(latestParamVariableNames, paramValueNodes),
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

		// For `:?binding=...`.
		if (this.delegatorVariableName) {
			let isStaticUpdate = !latestParamVariableNames
			return this.outputDelegator(queryValue!, latestQueryParamVariableName, update, isStaticUpdate)
		}

		return update
	}

	/** To patch update call method and values. */
	protected patchCallMethodAndValues(callWith: BindingUpdateCallWith): BindingUpdateCallWith {
		return callWith
	}

	private outputDelegator(
		queryValue: TS.Expression,
		latestQueryParamVariableName: string | null,
		update: TS.Statement | TS.Expression,
		isStaticUpdate: boolean
	) {

		console.log(this.parameterList!.map(Helper.getFullText), latestQueryParamVariableName, isStaticUpdate)

		// if ($values[0]) {
		//   NormalUpdateLogic
		// }

		// if ($values[0] && !$latest_0) {
		//   StaticUpdatePosition
		//   $delegator_0.update($binding_0)
		//   $latest_0 = $values[0]
		// }
		// else if (!$values[0] && $latest_0) {
		//   $delegator_0.update(null)
		//   $latest_0 = $values[0]
		// }

		// If `isStaticUpdate`,
		// Moves `NormalUpdateLogic` to `StaticUpdatePosition`.

		let updateIf: TS.Statement | null = null
		
		if (!isStaticUpdate) {
			updateIf = factory.createIfStatement(
				queryValue,
				factory.createBlock(
					[Helper.pack.toStatement(update)],
					true
				),
				undefined
			)
		}
		

		let compare: TS.Statement | null = null

		if (latestQueryParamVariableName) {
			compare = factory.createIfStatement(
				factory.createBinaryExpression(
					queryValue,
					factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
					factory.createPrefixUnaryExpression(
						ts.SyntaxKind.ExclamationToken,
						factory.createIdentifier(latestQueryParamVariableName)
					)
				),
				factory.createBlock(
					[
						...(isStaticUpdate ? [Helper.pack.toStatement(update)] : []),
						factory.createExpressionStatement(factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier(this.delegatorVariableName!),
								factory.createIdentifier('update')
							),
							undefined,
							[factory.createIdentifier(this.bindingVariableName)]
						)),
						factory.createExpressionStatement(factory.createBinaryExpression(
							factory.createIdentifier(latestQueryParamVariableName),
							factory.createToken(ts.SyntaxKind.EqualsToken),
							queryValue
						))
					],
					true
				),
				factory.createIfStatement(
					factory.createBinaryExpression(
						factory.createPrefixUnaryExpression(
							ts.SyntaxKind.ExclamationToken,
							queryValue
						),
						factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
						factory.createIdentifier(latestQueryParamVariableName)
					),
					factory.createBlock(
					[
						factory.createExpressionStatement(factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier(this.delegatorVariableName!),
								factory.createIdentifier('update')
							),
							undefined,
							[factory.createNull()]
						)),
						factory.createExpressionStatement(factory.createBinaryExpression(
							factory.createIdentifier(latestQueryParamVariableName),
							factory.createToken(ts.SyntaxKind.EqualsToken),
							queryValue
						))
					],
					true
					),
					undefined
				)
			)
		}
		
		return [
			...(updateIf ? [updateIf] : []),
			...(compare ? [compare] : []),
		]
	}
}