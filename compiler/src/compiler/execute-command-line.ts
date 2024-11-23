//// From https://github.com/microsoft/TypeScript/blob/main/src/compiler/executeCommandLine.ts


import * as ts from 'typescript'
import * as fs from 'node:fs';
import {createDiagnosticReporter, createWatchStatusReporter} from './watch';
import {hasProperty} from './core';
import {DiagnosticModifier, ExtendedTransformerFactory, interpolateHostCreateProgram} from '../patch';


export function executeCommandLine(
	system: ts.System,
	commandLineArgs: readonly string[],
	transformers: ExtendedTransformerFactory[]
) {
	let commandLine = ts.parseCommandLine(commandLineArgs)
	let pretty = shouldBePretty(system, commandLine.options);
	let diagModifier = new DiagnosticModifier()
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
	const buildOptions: ts.BuildOptions = {incremental: false}

	if (isWatchSet(compilerOptions)) {
		return performWatchCompilation(
			system,
			reportDiagnostic,
			diagModifier,
			projects,
			compilerOptions,
			buildOptions,
			watchOptions,
			transformers
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
			transformers
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
	transformers: ExtendedTransformerFactory[]
) {

	// Inspired by https://stackoverflow.com/questions/62026189/typescript-custom-transformers-with-ts-createwatchprogram/62132983
	const watchBuildHost = ts.createSolutionBuilderWithWatchHost(
		system,
		undefined,
		reportDiagnostic,
		reportDiagnostic,
		createWatchReporter(system, compilerOptions, diagModifier, () => builder, () => standardTransformers),
	);

	let standardTransformers = interpolateHostCreateProgram(watchBuildHost, diagModifier, transformers)

	let builder: ts.SolutionBuilder<ts.EmitAndSemanticDiagnosticsBuilderProgram> =
		ts.createSolutionBuilderWithWatch(
			watchBuildHost,
			projects,
			buildOptions,
			watchOptions
		);

	doNextBuild(builder, diagModifier, standardTransformers);
	return builder.build();
}

function doNextBuild(
	solutionBuilder: ts.SolutionBuilder<ts.EmitAndSemanticDiagnosticsBuilderProgram>,
	diagModifier: DiagnosticModifier,
	transformers: ts.TransformerFactory<ts.SourceFile>[]
) {
	let project = solutionBuilder.getNextInvalidatedProject();
	if (project) {
		buildProject(project, diagModifier, transformers);
	}
}

function buildProject(
	project: ts.InvalidatedProject<ts.EmitAndSemanticDiagnosticsBuilderProgram>,
	diagModifier: DiagnosticModifier,
	transformers: ts.TransformerFactory<ts.SourceFile>[]
) {
	if (project.kind !== ts.InvalidatedProjectKind.Build) {
		return;
	}

	let program = project.getProgram()!;
	let diagnostics = program!.getSemanticDiagnostics();

	diagModifier.updateTotal(diagnostics);

	project.emit(
		undefined,
		undefined,
		undefined,
		undefined,
		{before: transformers},
	);

	diagModifier.reportAdded();
}

function createWatchReporter(
	system: ts.System,
	options: ts.CompilerOptions | ts.BuildOptions,
	diagModifier: DiagnosticModifier,
	solutionBuilderGetter: () => ts.SolutionBuilder<ts.EmitAndSemanticDiagnosticsBuilderProgram>,
	transformersGetter: () => ts.TransformerFactory<ts.SourceFile>[]
): ts.WatchStatusReporter {
	let pretty = shouldBePretty(system, options);
	let rawReporter = createWatchStatusReporter(system, pretty);
	let reporter = diagModifier.patchWatchStatusReporter(rawReporter)

	return (diagnostic: ts.Diagnostic, newLine: string, options: ts.CompilerOptions, errorCount?: number) => {
		reporter(diagnostic, newLine, options, errorCount)
		doNextBuild(solutionBuilderGetter(), diagModifier, transformersGetter())
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
	transformers: ExtendedTransformerFactory[]
) {
	const buildHost = ts.createSolutionBuilderHost(
        system,
        undefined,
        reportDiagnostic,
        ts.createBuilderStatusReporter(system, shouldBePretty(system, compilerOptions))
    );

	let standardTransformers = interpolateHostCreateProgram(buildHost, diagModifier, transformers)

    const builder = ts.createSolutionBuilder(buildHost, projects, buildOptions);
	doNextBuild(builder, diagModifier, standardTransformers);

	// Can't build here, or it will cause build without transformers when meet any diagnostics.
	// return builder.build();

	return system.exit(ts.ExitStatus.Success);
}
