const assert = require('node:assert/strict')
const test = require('node:test')
const ts = require('typescript')
const {Packer, setTransformContext, createTransformSession} = require('../cli/transformer/out/core')
const {CompilerDiagnosticModifier} = require('../cli/compiler/out/patch')


/** Supply a real factory and source text without writing a compilation fixture to disk. */
function withExpression(text, verify) {
	let source = ts.createSourceFile('comments.ts', text, ts.ScriptTarget.Latest, true)
	let program = ts.createProgram([], {})
	let result = ts.transform(source, [context => file => {
		setTransformContext(context, {
			program: {getProgram: () => program},
			compileToESM: false,
			embedSVG: false,
			compilerDiagnosticModifier: new CompilerDiagnosticModifier(),
		})
		createTransformSession(file)
		verify(file.statements[0].expression, file)
		return file
	}])

	result.dispose()
}

/** Print an expression with comments enabled so removal is observable. */
function print(node, source) {
	return ts.createPrinter().printNode(ts.EmitHint.Expression, node, source)
}


test('preserves comment-free access trees and original parent pointers', () => {
	let expressions = [
		'this.profile.role',
		'this.list[index + 1]',
		'this.ref?.store.currentData',
		'this.ref?.stores[0]',
		'this["/* not a comment */"]',
	]

	for (let text of expressions) {
		withExpression(text, node => {
			let cleaned = Packer.removeAccessComments(node)
			assert.equal(cleaned, node)
			assert.equal(cleaned.expression, node.expression)
			if (ts.isPropertyAccessExpression(node)) {
				assert.equal(cleaned.name, node.name)
				assert.equal(cleaned.name.parent, node)
			}
		})
	}
})

test('inspects member-name comments and preserves unaffected sibling branches', () => {
	withExpression('this./* member */profile.role', (node, source) => {
		let receiver = node.expression
		let cleaned = Packer.removeAccessComments(node)
		assert.notEqual(cleaned, node)
		assert.notEqual(cleaned.expression, receiver)
		assert.equal(cleaned.expression.expression, receiver.expression)
		assert.equal(cleaned.name, node.name)
		assert.equal(print(cleaned, source), 'this.profile.role')
		assert.match(print(node, source), /member/)
	})
})

test('inspects comments inside computed-key expressions', () => {
	withExpression('this.list[/* key */index + offset]', (node, source) => {
		let cleaned = Packer.removeAccessComments(node)
		assert.notEqual(cleaned, node)
		assert.equal(cleaned.expression, node.expression)
		assert.notEqual(cleaned.argumentExpression, node.argumentExpression)
		assert.equal(cleaned.argumentExpression.right, node.argumentExpression.right)
		assert.doesNotMatch(print(cleaned, source), /key/)
		assert.match(print(node, source), /key/)
	})
})

test('removes source comments on literal keys and on the access itself', () => {
	let expressions = [
		'this[/* key */"profile"]',
		'this.list[/* key */0]',
		'/* leading */ this.profile',
		'this.profile /* trailing */',
	]

	for (let text of expressions) {
		withExpression(text, (node, source) => {
			let cleaned = Packer.removeAccessComments(node)
			assert.notEqual(cleaned, node)
			assert.doesNotMatch(print(cleaned, source), /\/\*/)
			assert.match(print(node, source), /\/\*/)
		})
	}
})

test('removes synthetic child comments without mutating the original node', () => {
	withExpression('this.profile.role', (node, source) => {
		ts.addSyntheticLeadingComment(node.expression.name, ts.SyntaxKind.MultiLineCommentTrivia, ' synthetic ', false)
		let cleaned = Packer.removeAccessComments(node)
		assert.notEqual(cleaned, node)
		assert.equal(cleaned.name, node.name)
		assert.equal(cleaned.expression.expression, node.expression.expression)
		assert.doesNotMatch(print(cleaned, source), /synthetic/)
		assert.match(print(node, source), /synthetic/)
	})
})

test('preserves continued optional chains when a commented descendant is rebuilt', () => {
	let expressions = [
		'this.ref?./* member */store.currentData',
		'this.ref?.stores[/* key */0].currentData',
	]

	for (let text of expressions) {
		withExpression(text, (node, source) => {
			let cleaned = Packer.removeAccessComments(node)
			assert.notEqual(cleaned, node)
			assert.ok(ts.isPropertyAccessChain(cleaned))
			assert.equal(cleaned.questionDotToken, undefined)
			assert.doesNotMatch(print(cleaned, source), /\/\*|\)\./)
		})
	}
})
