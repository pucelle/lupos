import ts from 'typescript'
import {defineVisitor} from '../../core'
import {analyzeDecoratorClass, isObservableDecoratorName} from './decorators'
import {compileDecoratorLife} from './observable-life'
import {compileContextVariableDecorator} from './context-variable'
import {compileObservableDecorator} from './observable'


defineVisitor(ts.SyntaxKind.ClassDeclaration, function(node: ts.Node) {
	if (!ts.isClassDeclaration(node)) {
		return
	}

	let analysis = analyzeDecoratorClass(node)
	if (analysis.members.length === 0) {
		return
	}

	compileDecoratorLife(node, analysis)

	for (let item of analysis.members) {
		if (item.kind !== 'decorator') {
			continue
		}

		if (isObservableDecoratorName(item.decoratorName)) {
			compileObservableDecorator(item)
		}
		else {
			compileContextVariableDecorator(item)
		}
	}
})

