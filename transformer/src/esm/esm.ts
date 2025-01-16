import * as ts from 'typescript'
import {defineVisitor, compileToESM, sourceFile, Interpolator, InterpolationContentType} from '../core'


// `import * from './a'` -> `import * from './a.js'`
defineVisitor(function(node: ts.Node) {
	if (!compileToESM) {
		return
	}
		
	if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) {
		return
	}

	let specifier = node.moduleSpecifier
	if (!specifier || !ts.isStringLiteral(specifier)) {
		return
	}

	let relativePath = specifier.text
	if (!relativePath.startsWith('.')) {
		return
	}

	let modulePath = ts.resolveModuleName(relativePath, sourceFile.fileName, {}, ts.sys).resolvedModule?.resolvedFileName
	if (!modulePath) {
		return
	}

	let relativeRealPath = pathRelative(sourceFile.fileName, modulePath)
	if (!relativeRealPath) {
		return
	}

	if (relativeRealPath.endsWith('.ts') && !relativeRealPath.endsWith('.d.ts')) {
		Interpolator.replace(specifier, InterpolationContentType.Normal, () => {
			return ts.factory.createStringLiteral(relativeRealPath.replace(/\.ts/, '.js'))
		})
	}
})


/** Get relative path. */
export function pathRelative(currentPath: string, targetPath: string): string | undefined {
	let currentPieces = currentPath.split('/')
	let targetPieces = targetPath.split('/')

	if (targetPieces[0] !== currentPieces[0]) {
		return undefined
	}

	let index = 1
	let maxIndex = Math.min(targetPieces.length, currentPieces.length)

	while (index < maxIndex && targetPieces[index] === currentPieces[index]) {
		index++
	}

	// Use dir path.
	let currentRelativePieces = currentPieces.slice(index, currentPieces.length - 1).map(() => '..')
	let targetRelativePieces = targetPieces.slice(index)

	if (currentRelativePieces.length === 0) {
		currentRelativePieces.push('.')
	}

	return [...currentRelativePieces, ...targetRelativePieces].join('/')
}


