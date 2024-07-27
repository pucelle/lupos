import type TS from 'typescript'
import {helper, ts, defineVisitor, factory, interpolator, InterpolationContentType} from '../base'


defineVisitor(function(node: TS.Node, index: number) {
		
	// Property and decorated.
	if (!ts.isPropertyDeclaration(node)) {
		return
	}

	let decorator = helper.deco.getFirst(node)!
	if (!decorator) {
		return
	}

	let decoName = helper.deco.getName(decorator)
	if (!decoName || !['setContext', 'useContext'].includes(decoName)) {
		return
	}

	interpolator.replace(index, InterpolationContentType.Normal, () => {
		if (decoName === 'setContext') {
			return compileSetContextDecorator(node)
		}
		else {
			return compileUseContextDecorator(node)
		}
	})
})



/*
```ts
Compile `@setContext prop: type = xxx` to:

prop: type = xxx
```
*/
function compileSetContextDecorator(propDecl: TS.PropertyDeclaration): TS.Node[] {
	let prop = factory.createPropertyDeclaration(
		undefined,
		propDecl.name,
		undefined,
		propDecl.type,
		propDecl.initializer
	)

	return [prop]
}


/*
```ts
Compile `@useContext prop` to:

#prop_declared_by: any | null = null

// @useContext
get prop(): number | undefined {
	return this.#prop_declared_by?.['prop']
}
```
*/
function compileUseContextDecorator(propDecl: TS.PropertyDeclaration): TS.Node[] {
	let propName = helper.getText(propDecl.name)

	let propDeclaredBy = factory.createPropertyDeclaration(
		undefined,
		factory.createPrivateIdentifier('#' + propName + '_declared_by'),
		undefined,
		factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
		factory.createIdentifier('undefined')
	)

	let getter = factory.createGetAccessorDeclaration(
		undefined,
		factory.createIdentifier(propName),
		[],
		factory.createUnionTypeNode([
		 	factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
			factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
		]),
		factory.createBlock([
			factory.createReturnStatement(factory.createElementAccessChain(
				factory.createPropertyAccessExpression(
			  		factory.createThis(),
			  		factory.createPrivateIdentifier('#' + propName + '_declared_by')
				),
				factory.createToken(ts.SyntaxKind.QuestionDotToken),
				factory.createStringLiteral(propName)
		 	))],
		  	true
		)
	)
	
	return [propDeclaredBy, getter]
}