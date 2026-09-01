import ts from 'typescript'
import {factory, Interpolator, InterpolationContentType, Modifier, helper} from '../../core'
import {DecoratedMemberAnalysis} from './decorators'


/** To compile `@useContext` and `@setContext`. */
export function compileContextVariableDecorator(analysis: DecoratedMemberAnalysis) {
	let {decorator, decoratorName, member} = analysis
	let property = member as ts.PropertyDeclaration

	Modifier.removeImportOf(decorator)

	Interpolator.replace(property, InterpolationContentType.Normal, () => {
		if (decoratorName === 'setContext') {
			return compileSetContextDecorator(property)
		}
		else {
			return compileUseContextDecorator(property)
		}
	})
}



/*
```ts
Compile `@setContext prop: type = xxx` to:

prop: type = xxx
```
*/
function compileSetContextDecorator(propDecl: ts.PropertyDeclaration): ts.Node[] {
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

$prop_declared_by: any = undefined

// @useContext
get prop(): any {
	return this.$prop_declared_by?.['prop']
}
```
*/
function compileUseContextDecorator(propDecl: ts.PropertyDeclaration): ts.Node[] {
	let propName = helper.getFullText(propDecl.name)

	let propDeclaredBy = factory.createPropertyDeclaration(
		undefined,
		factory.createIdentifier('$' + propName + '_declared_by'),
		undefined,
		factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
		factory.createIdentifier('undefined')
	)

	let getter = factory.createGetAccessorDeclaration(
		undefined,
		factory.createIdentifier(propName),
		[],
		factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
		factory.createBlock([
			factory.createReturnStatement(factory.createElementAccessChain(
				factory.createPropertyAccessExpression(
			  		factory.createThis(),
			  		factory.createIdentifier('$' + propName + '_declared_by')
				),
				factory.createToken(ts.SyntaxKind.QuestionDotToken),
				factory.createStringLiteral(propName)
		 	))],
		  	true
		)
	)
	
	return [propDeclaredBy, getter]
}
