import ts from 'typescript'
import * as fs from 'node:fs'
import * as path from 'node:path'


/** Remove orphaned JavaScript and declaration outputs before compilation starts. */
export function cleanCachedOutputs(
	system: ts.System,
	configFileName: string,
	reportDiagnostic: ts.DiagnosticReporter
): boolean {
	let configurations = new Map<string, ts.ParsedCommandLine>()
	if (!collectConfigurations(system, configFileName, configurations, reportDiagnostic)) {
		return false
	}

	let expectedOutputs = new Set<string>()
	let outputDirectories = new Set<string>()
	let sourceDirectories: string[] = []
	let sourceFiles: string[] = []

	for (let [fileName, configuration] of configurations) {
		let options = configuration.options
		sourceDirectories.push(options.rootDir ?? path.dirname(fileName))

		// Imported sources can be emitted even when they are outside the include patterns.
		let program = ts.createProgram({
			rootNames: configuration.fileNames,
			options,
			projectReferences: configuration.projectReferences,
		})

		let emittedSources = program.getSourceFiles().filter(source => {
			return !source.isDeclarationFile && !program.isSourceFileFromExternalLibrary(source)
		})
		let outputConfiguration = {...configuration, fileNames: emittedSources.map(source => source.fileName)}
		sourceFiles.push(...outputConfiguration.fileNames)

		for (let sourceFile of outputConfiguration.fileNames) {
			if (!system.fileExists(sourceFile)) {
				continue
			}

			for (let outputFile of ts.getOutputFileNames(outputConfiguration, sourceFile, !system.useCaseSensitiveFileNames)) {
				expectedOutputs.add(normalizePath(system, outputFile))
			}
		}

		for (let directory of [options.outDir, options.declarationDir]) {
			if (directory) {
				outputDirectories.add(path.resolve(directory))
			}
		}
	}

	try {
		for (let directory of outputDirectories) {
			if (sourceDirectories.some(source => containsPath(system, directory, source))
				|| sourceFiles.some(file => containsPath(system, directory, file))
			) {
				system.write(`Skipping cache cleanup in source directory "${directory}".${system.newLine}`)
				continue
			}

			cleanDirectory(system, directory, expectedOutputs)
		}
	}
	catch (error) {
		system.write(`Failed to clean compiled cache: ${error instanceof Error ? error.message : error}${system.newLine}`)
		return false
	}

	return true
}


/** Parse all referenced projects before deleting anything, including projects sharing outputs. */
function collectConfigurations(
	system: ts.System,
	fileName: string,
	configurations: Map<string, ts.ParsedCommandLine>,
	reportDiagnostic: ts.DiagnosticReporter
): boolean {
	fileName = path.resolve(fileName)
	let key = normalizePath(system, fileName)
	if (configurations.has(key)) {
		return true
	}

	let configuration = ts.getParsedCommandLineOfConfigFile(fileName, {}, {
		...system,
		onUnRecoverableConfigFileDiagnostic: reportDiagnostic,
	})

	if (!configuration) {
		return false
	}

	if (configuration.errors.length > 0) {
		configuration.errors.forEach(reportDiagnostic)
		return false
	}

	configurations.set(key, configuration)

	for (let reference of configuration.projectReferences ?? []) {
		if (!collectConfigurations(system, ts.resolveProjectReferencePath(reference), configurations, reportDiagnostic)) {
			return false
		}
	}

	return true
}


/** Delete only unmapped output files, never following directory or file symlinks. */
function cleanDirectory(system: ts.System, directory: string, expectedOutputs: Set<string>) {
	if (path.basename(directory) === 'node_modules'
		|| !fs.existsSync(directory)
		|| !fs.lstatSync(directory).isDirectory()
	) {
		return
	}

	if (system.realpath
		&& normalizePath(system, system.realpath(directory)) !== normalizePath(system, directory)
	) {
		return
	}

	for (let entry of fs.readdirSync(directory, {withFileTypes: true})) {
		let fileName = path.join(directory, entry.name)
		if (entry.isDirectory() && entry.name !== 'node_modules') {
			cleanDirectory(system, fileName, expectedOutputs)
		}
		else if (entry.isFile()
			&& (entry.name.endsWith('.js') || entry.name.endsWith('.d.ts'))
			&& !expectedOutputs.has(normalizePath(system, fileName))
		) {
			fs.unlinkSync(fileName)
			system.write(`Removed "${fileName}".${system.newLine}`)
		}
	}
}


/** Test path containment without confusing sibling directory prefixes. */
function containsPath(system: ts.System, directory: string, fileName: string): boolean {
	let relative = path.relative(normalizePath(system, directory), normalizePath(system, fileName))
	return relative === ''
		|| relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)
}


/** Compare output names using the compiler host's path casing rules. */
function normalizePath(system: ts.System, fileName: string): string {
	let resolved = path.resolve(fileName)
	return system.useCaseSensitiveFileNames ? resolved : resolved.toLowerCase()
}
