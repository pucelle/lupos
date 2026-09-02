import ts from 'typescript'
import {VisitTree} from './visit-tree'
import {DeclarationScope} from './scope'
import {Packer} from './packer'
import {transformSession, transformContext} from './global'
import {addToList} from '../utils'
import {DeclarationScopeTree} from './scope-tree'
import {createTransformSessionStateKey} from './transform-session'


/** Collision-free structural identity within one transformed source file. */
export type HashKey = number

export interface HashItem {

	/** Structural identity within the current source file. */
	key: HashKey

	/** The variable declaration scopes that current node used. */
	usedScopes: DeclarationScope[]

	/** The variable declaration nodes that current node used. */
	usedDeclarations: ts.Node[]
}

interface HashingState {
	rawCache: WeakMap<ts.Node, HashItem>
	syntheticCache: WeakMap<ts.Node, WeakMap<ts.Node, HashItem>>
	signatureToKey: Map<string, HashKey>
	keySeed: number
	legacyToStructural: Map<string, HashKey>
	structuralToLegacy: Map<HashKey, string>
}

interface DependencyCollector {
	scopes: DeclarationScope[]
	scopeSet: Set<DeclarationScope>
	declarations: ts.Node[]
}

const ValidateStructuralHashing = process.env.LUPOS_VALIDATE_STRUCTURAL_HASHING === '1'
const ValidPropertyNamePattern = /^[a-z_$][\w$_]*$/i


export namespace Hashing {

	const StateKey = createTransformSessionStateKey<HashingState>('Hashing')

	function getState(): HashingState {
		return transformSession.getState(StateKey, () => ({
			rawCache: new WeakMap(),
			syntheticCache: new WeakMap(),
			signatureToKey: new Map(),
			keySeed: 0,
			legacyToStructural: new Map(),
			structuralToLegacy: new Map(),
		}))
	}

	/** Get structural hash result of a raw node. */
	export function hashNode(rawNode: ts.Node): HashItem {
		let state = getState()
		let cached = state.rawCache.get(rawNode)
		if (cached) {
			return cached
		}

		let hashed = doStructuralHashing(rawNode, rawNode)
		state.rawCache.set(rawNode, hashed)
		validateAgainstLegacy(rawNode, rawNode, hashed)

		return hashed
	}

	/**
	 * Get structural hash result of a raw or newly created node.
	 * Synthetic nodes are cached by their closest raw-node context because
	 * variable identities depend on that lexical position.
	 */
	export function hashMayNewNode(node: ts.Node, closestRawNode: ts.Node): HashItem {
		if (VisitTree.hasNode(node)) {
			return hashNode(node)
		}

		let state = getState()
		let contextualCache = state.syntheticCache.get(node)
		let cached = contextualCache?.get(closestRawNode)
		if (cached) {
			return cached
		}

		let hashed = doStructuralHashing(node, closestRawNode)
		if (!contextualCache) {
			contextualCache = new WeakMap()
			state.syntheticCache.set(node, contextualCache)
		}
		contextualCache.set(closestRawNode, hashed)
		validateAgainstLegacy(node, closestRawNode, hashed)

		return hashed
	}

	/** Hash a property name represented directly as a string. */
	export function hashString(value: string): HashKey {
		return intern('node', `${ts.SyntaxKind.StringLiteral}:0:${value}`, [])
	}

	function doStructuralHashing(node: ts.Node, closestRawNode: ts.Node): HashItem {
		let collector: DependencyCollector = {
			scopes: [],
			scopeSet: new Set(),
			declarations: [],
		}
		let key = hashNodeStructurally(node, closestRawNode, collector)

		return {
			key,
			usedScopes: collector.scopes,
			usedDeclarations: collector.declarations,
		}
	}

	function hashNodeStructurally(node: ts.Node, closestRawNode: ts.Node, collector: DependencyCollector): HashKey {
		let rawContext = VisitTree.hasNode(node) ? node : closestRawNode

		// These wrappers are deliberately transparent in Packer.normalize().
		if (ts.isAsExpression(node)
			|| ts.isParenthesizedExpression(node)
			|| ts.isNonNullExpression(node)
		) {
			return hashNodeStructurally(node.expression, rawContext, collector)
		}

		// `a['prop']` and `a.prop` have the same normalized identity.
		if (ts.isElementAccessExpression(node)
			&& ts.isStringLiteral(node.argumentExpression)
			&& ValidPropertyNamePattern.test(node.argumentExpression.text)
		) {
			let expressionKey = hashNodeStructurally(node.expression, rawContext, collector)
			let nameKey = intern('node', `${ts.SyntaxKind.Identifier}:0:${node.argumentExpression.text}`, [])
			let optional = node.flags & ts.NodeFlags.OptionalChain ? '1:' : '0:'

			return intern('node', `${ts.SyntaxKind.PropertyAccessExpression}:${optional}`, [expressionKey, nameKey])
		}

		if (transformContext.helper.isVariableIdentifier(node)) {
			let {name, scope} = resolveVariableName(node, rawContext)
			addScopeDependency(scope, collector)

			let declaration = scope.getVariableDeclaredOrReferenced(node.text)
			if (declaration) {
				collector.declarations.push(declaration)
			}

			return intern('variable', name, [])
		}

		if (transformContext.helper.isThis(node)) {
			let {name, scope} = resolveVariableName(node as ts.ThisExpression, rawContext)
			addScopeDependency(scope, collector)

			return intern('this', name, [])
		}

		let childKeys: HashKey[] = []
		ts.forEachChild(
			node,
			child => {
				// Optional-chain state is encoded on the containing node, not the token.
				if (child.kind !== ts.SyntaxKind.QuestionDotToken) {
					childKeys.push(hashNodeStructurally(child, rawContext, collector))
				}
			},
			children => {
				let listKeys: HashKey[] = []
				for (let child of children) {
					if (child.kind !== ts.SyntaxKind.QuestionDotToken) {
						listKeys.push(hashNodeStructurally(child, rawContext, collector))
					}
				}

				childKeys.push(intern('list', children.hasTrailingComma ? '1' : '0', listKeys))
			}
		)

		return intern('node', `${node.kind}:${getNodePayload(node)}`, childKeys)
	}

	function getNodePayload(node: ts.Node): string {
		let optional = node.flags & ts.NodeFlags.OptionalChain ? '1:' : '0:'

		if (ts.isIdentifier(node)
			|| ts.isPrivateIdentifier(node)
			|| ts.isStringLiteral(node)
			|| ts.isNumericLiteral(node)
			|| ts.isBigIntLiteral(node)
			|| ts.isRegularExpressionLiteral(node)
			|| ts.isNoSubstitutionTemplateLiteral(node)
			|| ts.isTemplateHead(node)
			|| ts.isTemplateMiddle(node)
			|| ts.isTemplateTail(node)
			|| ts.isJsxText(node)
		) {
			return optional + node.text
		}

		if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
			return optional + node.operator
		}

		if (ts.isMetaProperty(node)) {
			return optional + node.keywordToken
		}

		if (ts.isVariableDeclarationList(node)) {
			let declarationFlags = node.flags
				& (ts.NodeFlags.Let | ts.NodeFlags.Const | ts.NodeFlags.Using | ts.NodeFlags.AwaitUsing)
			return optional + declarationFlags
		}

		if (ts.isHeritageClause(node)) {
			return optional + node.token
		}

		if (ts.isImportClause(node) || ts.isImportSpecifier(node) || ts.isExportSpecifier(node)) {
			return optional + (node.isTypeOnly ? '1' : '0')
		}

		if (ts.isImportTypeNode(node)) {
			return optional + (node.isTypeOf ? '1' : '0')
		}

		if (ts.isExportAssignment(node)) {
			return optional + (node.isExportEquals ? '1' : '0')
		}

		return optional
	}

	function addScopeDependency(scope: DeclarationScope, collector: DependencyCollector) {
		if (!collector.scopeSet.has(scope)) {
			collector.scopeSet.add(scope)
			collector.scopes.push(scope)
		}
	}

	function resolveVariableName(
		node: ts.Identifier | ts.ThisExpression,
		closestRawNode: ts.Node
	): {name: string, scope: DeclarationScope} {
		let closest = DeclarationScopeTree.findClosest(closestRawNode)
		let scope = DeclarationScopeTree.findDeclared(node, closest) || closest
		let name = VisitTree.hasNode(node)
			? transformContext.helper.getFullText(node)
			: ts.isIdentifier(node) ? node.text : 'this'
		let suffix = VisitTree.getIndex(scope.node)

		return {
			name: name + '_' + suffix,
			scope,
		}
	}

	function intern(tag: string, payload: string, children: HashKey[]): HashKey {
		let state = getState()
		let signature = `${tag.length}:${tag}${payload.length}:${payload}${children.length}:${children.join(',')}`
		let existing = state.signatureToKey.get(signature)
		if (existing !== undefined) {
			return existing
		}

		let key = state.keySeed++
		state.signatureToKey.set(signature, key)

		return key
	}

	function validateAgainstLegacy(node: ts.Node, closestRawNode: ts.Node, structural: HashItem) {
		if (!ValidateStructuralHashing) {
			return
		}

		let legacy = doLegacyHashing(node, closestRawNode)
		let state = getState()
		let structuralForLegacy = state.legacyToStructural.get(legacy.name)
		let legacyForStructural = state.structuralToLegacy.get(structural.key)

		if (structuralForLegacy !== undefined && structuralForLegacy !== structural.key) {
			throwHashValidationError(node, legacy.name, structural.key, 'legacy-equivalent nodes received different structural keys')
		}

		if (legacyForStructural !== undefined && legacyForStructural !== legacy.name) {
			throwHashValidationError(
				node,
				legacy.name,
				structural.key,
				`structurally-equivalent nodes had different legacy hashes; first legacy hash: ${legacyForStructural}`
			)
		}

		if (!sameItems(legacy.usedScopes, structural.usedScopes)
			|| !sameItems(legacy.usedDeclarations, structural.usedDeclarations)
		) {
			throwHashValidationError(node, legacy.name, structural.key, 'dependency lists differ')
		}

		state.legacyToStructural.set(legacy.name, structural.key)
		state.structuralToLegacy.set(structural.key, legacy.name)
	}

	function sameItems<T>(items1: T[], items2: T[]): boolean {
		return items1.length === items2.length && items1.every((item, index) => item === items2[index])
	}

	function throwHashValidationError(node: ts.Node, legacyName: string, structuralKey: HashKey, reason: string): never {
		let sourceFile = node.getSourceFile()
		let nodeText: string
		try {
			nodeText = transformContext.helper.getFullText(node)
		}
		catch {
			nodeText = ts.SyntaxKind[node.kind]
		}

		throw new Error(
			`Structural hashing mismatch (${reason}) in "${sourceFile?.fileName ?? 'synthetic node'}". `
			+ `Node: ${nodeText}; legacy: ${legacyName}; structural: ${structuralKey}.`
		)
	}

	/** Printer-based implementation retained only as a validation oracle. */
	function doLegacyHashing(node: ts.Node, closestRawNode: ts.Node): {name: string, usedScopes: DeclarationScope[], usedDeclarations: ts.Node[]} {
		let usedScopes: DeclarationScope[] = []
		let usedDeclarations: ts.Node[] = []
	
		let hashVisited = ts.visitNode(node, (child: ts.Node) => {
			return legacyHashNodeVisitor(
				child,
				VisitTree.hasNode(child) ? child : closestRawNode,
				usedScopes,
				usedDeclarations
			)
		})!

		let normalized = Packer.normalize(hashVisited, true)

		return {
			name: transformContext.helper.getFullText(normalized),
			usedScopes,
			usedDeclarations,
		}
	}

	function legacyHashNodeVisitor(
		node: ts.Node,
		closestRawNode: ts.Node,
		usedScopes: DeclarationScope[],
		usedDeclarations: ts.Node[]
	): ts.Node | undefined {
		if (transformContext.helper.isVariableIdentifier(node)) {
			let {name, scope} = resolveVariableName(node, closestRawNode)
			let declaration = scope.getVariableDeclaredOrReferenced(node.text)

			addToList(usedScopes, scope)
			if (declaration) {
				usedDeclarations.push(declaration)
			}

			return transformContext.factory.createIdentifier(name)
		}

		if (transformContext.helper.isThis(node)) {
			let {name, scope} = resolveVariableName(node as ts.ThisExpression, closestRawNode)
			addToList(usedScopes, scope)

			return transformContext.factory.createIdentifier(name)
		}

		if (node.kind === ts.SyntaxKind.QuestionDotToken) {
			return undefined
		}

		return ts.visitEachChild(
			node,
			child => legacyHashNodeVisitor(
				child,
				VisitTree.hasNode(child) ? child : closestRawNode,
				usedScopes,
				usedDeclarations
			),
			transformContext.transformationContext
		)
	}
}
