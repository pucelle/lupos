import ts from 'typescript'
import path from 'node:path'
import {defineVisitor, transformSession, Interpolator, InterpolationContentType, transformContext} from '../core'


// `import * from './a'` -> `import * from './a.js'`
// `import * from 'package/out/a'` -> `import * from 'package/out/a.js'`
defineVisitor([ts.SyntaxKind.ImportDeclaration, ts.SyntaxKind.ExportDeclaration], function(node: ts.ImportDeclaration | ts.ExportDeclaration) {
	if (!transformContext.compileToESM) {
		return
	}

	let specifier = node.moduleSpecifier
	if (!specifier || !ts.isStringLiteral(specifier)) {
		return
	}

	let rewritten = rewriteModuleSpecifier(specifier.text)
	if (!rewritten) {
		return
	}

	Interpolator.replace(specifier, InterpolationContentType.Normal, () => {
		return transformContext.factory.createStringLiteral(rewritten)
	})
})


// `import('./a')` -> `import('./a.js')`
defineVisitor(ts.SyntaxKind.CallExpression, function(node: ts.CallExpression) {
	if (!transformContext.compileToESM
		|| node.expression.kind !== ts.SyntaxKind.ImportKeyword
		|| node.arguments.length !== 1
	) {
		return
	}

	let specifier = node.arguments[0]
	if (!ts.isStringLiteral(specifier)) {
		return
	}

	let rewritten = rewriteModuleSpecifier(specifier.text)
	if (!rewritten) {
		return
	}

	Interpolator.replace(specifier, InterpolationContentType.Normal, () => {
		return transformContext.factory.createStringLiteral(rewritten)
	})
})


/**
 * Resolve a source module name and return the runtime name required by native ESM.
 * An undefined result means the original specifier must be preserved.
 */
function rewriteModuleSpecifier(moduleName: string): string | undefined {
	// Already-runnable names must not be resolved and rewritten a second time.
	if (hasExplicitRuntimeExtension(moduleName) || moduleName.endsWith('.d.ts')) {
		return undefined
	}

	let sourceFileName = transformSession.sourceFile.fileName

	// Use the active program options so paths, moduleResolution, customConditions,
	// and preserveSymlinks behave exactly as they did during type checking.
	let resolved = ts.resolveModuleName(
		moduleName,
		sourceFileName,
		transformContext.program.getCompilerOptions(),
		ts.sys
	).resolvedModule

	if (!resolved) {
		return undefined
	}

	// Relative source paths are emitted at the same relative location. Convert the
	// resolved TypeScript/declaration extension to its JavaScript counterpart.
	if (moduleName.startsWith('.')) {
		let runtimePath = toRuntimePath(resolved.resolvedFileName)
		return runtimePath ? pathRelative(sourceFileName, runtimePath) : undefined
	}

	return rewritePackageSubpath(moduleName, resolved)
}

/**
 * Rewrite deep imports for packages without an exports map.
 *
 * Node does not add extensions for package subpaths such as `pkg/out/button`.
 * Packages with `exports` are excluded because their extensionless key may be an
 * intentional public mapping, and changing it could select a different export.
 */
function rewritePackageSubpath(moduleName: string, resolved: ts.ResolvedModuleFull): string | undefined {
	let packageName = getPackageName(moduleName)

	// Keep package roots (`pkg`, `@scope/pkg`) unchanged. Requiring packageId to
	// match also prevents path aliases from being mistaken for package imports.
	if (!packageName
		|| moduleName === packageName
		|| resolved.packageId?.name !== packageName
	) {
		return undefined
	}

	let packageInfo = findPackageInfo(resolved.resolvedFileName, packageName)

	// An exports map owns runtime subpath resolution, so leave those names intact.
	if (!packageInfo || packageInfo.json.exports !== undefined) {
		return undefined
	}

	let extension = getRuntimeExtension(resolved.resolvedFileName)
	if (!extension) {
		return undefined
	}

	let subpath = moduleName.slice(packageName.length + 1)

	// Only append an extension when the matching runtime file exists. TypeScript
	// commonly resolves the adjacent `.d.ts` file instead of this `.js` file.
	let directRuntimePath = path.join(packageInfo.directory, ...subpath.split('/')) + extension
	if (ts.sys.fileExists(directRuntimePath)) {
		return moduleName + extension
	}

	// Native ESM also rejects directory imports, so resolve an existing index file
	// explicitly instead of relying on CommonJS-style directory lookup.
	let indexRuntimePath = path.join(packageInfo.directory, ...subpath.split('/'), 'index' + extension)
	if (ts.sys.fileExists(indexRuntimePath)) {
		return moduleName + '/index' + extension
	}

	return undefined
}

/** Extract `pkg` or `@scope/pkg`, while rejecting URLs and package import maps. */
function getPackageName(moduleName: string): string | undefined {
	if (moduleName.startsWith('@')) {
		let pieces = moduleName.split('/')
		return pieces.length >= 2 ? pieces.slice(0, 2).join('/') : undefined
	}

	if (moduleName.startsWith('#')
		|| moduleName.startsWith('/')
		|| /^[a-z][a-z\d+.-]*:/i.test(moduleName)
	) {
		return undefined
	}

	return moduleName.split('/')[0]
}

/** Find the owning package instead of assuming the resolved file is under node_modules. */
function findPackageInfo(resolvedFileName: string, packageName: string): {directory: string, json: {exports?: unknown}} | undefined {
	let directory = path.dirname(resolvedFileName)

	while (true) {
		let packagePath = path.join(directory, 'package.json')
		if (ts.sys.fileExists(packagePath)) {
			try {
				let json = JSON.parse(ts.sys.readFile(packagePath)!) as {name?: string, exports?: unknown}
				if (json.name === packageName) {
					return {directory, json}
				}
			}
			catch {
				return undefined
			}
		}

		let parent = path.dirname(directory)
		if (parent === directory) {
			return undefined
		}
		directory = parent
	}
}

/** Whether already have compiled runtime file extension. */
function hasExplicitRuntimeExtension(moduleName: string): boolean {
	return /\.(?:[cm]?js|json|node)$/i.test(moduleName)
}

/** Map TypeScript's resolved file kind to the extension Node will execute. */
function getRuntimeExtension(fileName: string): string | undefined {
	if (/(?:\.d)?\.mts$/i.test(fileName) || fileName.endsWith('.mjs')) {
		return '.mjs'
	}
	if (/(?:\.d)?\.cts$/i.test(fileName) || fileName.endsWith('.cjs')) {
		return '.cjs'
	}
	if (/(?:\.d)?\.tsx?$/i.test(fileName) || fileName.endsWith('.js')) {
		return '.js'
	}
	return undefined
}

/** Replace `.ts`/`.d.ts`, `.mts`/`.d.mts`, or `.cts`/`.d.cts` with runtime extensions. */
function toRuntimePath(fileName: string): string | undefined {
	let extension = getRuntimeExtension(fileName)
	if (!extension) {
		return undefined
	}

	return fileName.replace(/(?:\.d)?\.[cm]?tsx?$|\.[cm]?js$/i, extension)
}


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


