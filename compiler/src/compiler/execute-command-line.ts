//// From https://github.com/microsoft/TypeScript/blob/main/src/compiler/executeCommandLine.ts


import * as ts from 'typescript'
import * as fs from 'node:fs';
import {createDiagnosticReporter, createWatchStatusReporter} from './watch';
import {hasProperty} from './core';
import {DiagnosticModifier, ExtendedTransformerFactory, patchHost} from '../patch';


export function executeCommandLine(
	system: ts.System,
	commandLineArgs: readonly string[],
	transformer: ExtendedTransformerFactory
) {
	let toESM = commandLineArgs.includes('--esm') || commandLineArgs.includes('-e');
	if (toESM) {
		commandLineArgs = commandLineArgs.filter(arg => arg !== '--esm' && arg !== '-e');
	}

	let commandLine = ts.parseCommandLine(commandLineArgs);
	let pretty = shouldBePretty(system, commandLine.options);
	let diagModifier = new DiagnosticModifier();
	let rawReportDiagnostic = createDiagnosticReporter(system, pretty);
	let reportDiagnostic = diagModifier.patchDiagnosticReporter(rawReportDiagnostic);

	// If there are any errors due to command line parsing and/or
	// setting up localization, report them and quit.
	if (commandLine.errors.length > 0) {
		commandLine.errors.forEach(reportDiagnostic);
		return system.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
	}

	if (commandLine.options.version) {
		printVersion(system);
		return system.exit(ts.ExitStatus.Success);
	}

	// Configuration file name (if any)
	const searchPath = system.getCurrentDirectory();
	let configFileName = ts.findConfigFile(searchPath, fileName => system.fileExists(fileName));

	if (!configFileName) {
		system.write(`Can't find "tsconfig.json" file at directory "${system.getCurrentDirectory()}"` + system.newLine);
		return system.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
	}

	const projects = ['.'];
	const compilerOptions = commandLine.options;
	const watchOptions = commandLine.watchOptions;

	const buildOptions: ts.BuildOptions = {
		// Will cause error if `"composite": true` set in tsconfig.json.
		//incremental: false
	};

	if (isWatchSet(compilerOptions)) {
		return performWatchCompilation(
			system,
			reportDiagnostic,
			diagModifier,
			projects,
			compilerOptions,
			buildOptions,
			watchOptions,
			transformer,
			toESM
		);
	}
	else {
		return performCompilation(
			system,
			reportDiagnostic,
			diagModifier,
			projects,
			compilerOptions,
			buildOptions,
			transformer,
			toESM
		);
	}
}

function printVersion(system: ts.System) {
	let luposPackagePath = __dirname + '/../../../package.json'
	let json = JSON.parse(fs.readFileSync(luposPackagePath).toString('utf-8'))

	system.write('Lupos Compiler Version: ' + json.version
		+ system.newLine + 'TS Version: ' + ts.version
		+ system.newLine
	);
}

function isWatchSet(options: ts.CompilerOptions) {

	// Firefox has Object.prototype.watch
	return options.watch && hasProperty(options, "watch");
}

function performWatchCompilation(
	system: ts.System,
	reportDiagnostic: ts.DiagnosticReporter,
	diagModifier: DiagnosticModifier,
	projects: string[],
	compilerOptions: ts.CompilerOptions,
	buildOptions: ts.BuildOptions,
	watchOptions: ts.WatchOptions | undefined,
	transformer: ExtendedTransformerFactory,
	toESM: boolean
) {

	// Inspired by https://stackoverflow.com/questions/62026189/typescript-custom-transformers-with-ts-createwatchprogram/62132983
	let watchBuildHost = ts.createSolutionBuilderWithWatchHost(
		system,
		undefined,
		reportDiagnostic,
		undefined,
		createWatchReporter(system, compilerOptions, diagModifier),
	);

	patchHost(watchBuildHost, transformer, toESM, diagModifier);
	
	let builder: ts.SolutionBuilder<ts.EmitAndSemanticDiagnosticsBuilderProgram> =
		ts.createSolutionBuilderWithWatch(
			watchBuildHost,
			projects,
			buildOptions,
			watchOptions
		);

	return builder.build();
}

function createWatchReporter(
	system: ts.System,
	options: ts.CompilerOptions | ts.BuildOptions,
	diagModifier: DiagnosticModifier
): ts.WatchStatusReporter {
	let pretty = shouldBePretty(system, options);
	let rawReporter = createWatchStatusReporter(system, pretty);
	let patchedReporter = diagModifier.patchWatchStatusReporter(rawReporter);

	return (diagnostic: ts.Diagnostic, newLine: string, options: ts.CompilerOptions, errorCount?: number) => {
		patchedReporter(diagnostic, newLine, options, errorCount);
	}
}

function shouldBePretty(system: ts.System, options: ts.CompilerOptions | ts.BuildOptions) {
	if (!options || typeof options.pretty === "undefined") {
		return defaultIsPretty(system);
	}
	return !!options.pretty;
}

function defaultIsPretty(system: ts.System) {
	return !!system.writeOutputIsTTY && system.writeOutputIsTTY();
}


function performCompilation(
	system: ts.System,
	reportDiagnostic: ts.DiagnosticReporter,
	diagModifier: DiagnosticModifier,
	projects: string[],
	compilerOptions: ts.CompilerOptions,
	buildOptions: ts.BuildOptions,
	transformer: ExtendedTransformerFactory,
	toESM: boolean
) {
	let buildHost = ts.createSolutionBuilderHost(
        system,
        undefined,
        reportDiagnostic,
        ts.createBuilderStatusReporter(system, shouldBePretty(system, compilerOptions))
    );

	patchHost(buildHost, transformer, toESM, diagModifier);

    let builder = ts.createSolutionBuilder(buildHost, projects, buildOptions);
	return builder.build();
}
