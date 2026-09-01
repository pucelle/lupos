import ts from 'typescript'
import {Interpolator, InterpolationContentType, Modifier, transformContext} from '../../core'
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
	let prop = transformContext.factory.createPropertyDeclaration(
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
	let propName = transformContext.helper.getFullText(propDecl.name)

	let propDeclaredBy = transformContext.factory.createPropertyDeclaration(
		undefined,
		transformContext.factory.createIdentifier('$' + propName + '_declared_by'),
		undefined,
		transformContext.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
		transformContext.factory.createIdentifier('undefined')
	)

	let getter = transformContext.factory.createGetAccessorDeclaration(
		undefined,
		transformContext.factory.createIdentifier(propName),
		[],
		transformContext.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
		transformContext.factory.createBlock([
			transformContext.factory.createReturnStatement(transformContext.factory.createElementAccessChain(
				transformContext.factory.createPropertyAccessExpression(
			  		transformContext.factory.createThis(),
			  		transformContext.factory.createIdentifier('$' + propName + '_declared_by')
				),
				transformContext.factory.createToken(ts.SyntaxKind.QuestionDotToken),
				transformContext.factory.createStringLiteral(propName)
		 	))],
		  	true
		)
	)
	
	return [propDeclaredBy, getter]
}
