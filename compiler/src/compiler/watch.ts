
//// From https://github.com/microsoft/TypeScript/blob/main/src/compiler/watch.ts


import * as ts from 'typescript';
import {ForegroundColorEscapeSequences, formatColorAndReset} from './program';
import {contains} from './core';


export function createDiagnosticReporter(system: ts.System, pretty?: boolean): ts.DiagnosticReporter {
	const host: ts.FormatDiagnosticsHost = {
		getCurrentDirectory: () => system.getCurrentDirectory(),
		getNewLine: () => system.newLine,
		getCanonicalFileName: createGetCanonicalFileName(system.useCaseSensitiveFileNames),
	};
	
	if (!pretty) {
		return diagnostic => {
            system.write(ts.formatDiagnostic(diagnostic, host));
        }
	}

	return diagnostic => {
		system.write(ts.formatDiagnosticsWithColorAndContext([diagnostic], host) + host.getNewLine());
	};
}

export function createWatchStatusReporter(system: ts.System, pretty?: boolean): ts.WatchStatusReporter {
    return pretty ?
        (diagnostic, newLine, options) => {
            clearScreenIfNotWatchingForFileChanges(system, diagnostic, options);
            let output = `[${formatColorAndReset(getLocaleTimeString(), ForegroundColorEscapeSequences.Grey)}] `;
            output += `${ts.flattenDiagnosticMessageText(diagnostic.messageText, system.newLine)}${newLine + newLine}`;
            system.write(output);
        } :
        (diagnostic, newLine, options) => {
            let output = "";

            if (!clearScreenIfNotWatchingForFileChanges(system, diagnostic, options)) {
                output += newLine;
            }

            output += `${getLocaleTimeString()} - `;
            output += `${ts.flattenDiagnosticMessageText(diagnostic.messageText, system.newLine)}${getPlainDiagnosticFollowingNewLines(diagnostic, newLine)}`;

            system.write(output);
        };
}

function clearScreenIfNotWatchingForFileChanges(system: ts.System, diagnostic: ts.Diagnostic, options: ts.CompilerOptions): boolean {
    if (
        system.clearScreen &&
        !options.preserveWatchOutput &&
        !options.extendedDiagnostics &&
        !options.diagnostics &&
        contains(screenStartingMessageCodes, diagnostic.code)
    ) {
        system.clearScreen();
        return true;
    }

    return false;
}

type GetCanonicalFileName = (fileName: string) => string

function createGetCanonicalFileName(useCaseSensitiveFileNames: boolean): GetCanonicalFileName {
    return useCaseSensitiveFileNames ? identity : toFileNameLowerCase;
}

function identity<T>(x: T) {
    return x;
}

function toLowerCase(x: string) {
    return x.toLowerCase();
}

const fileNameLowerCaseRegExp = /[^\u0130\u0131\u00DFa-z0-9\\/:\-_. ]+/g;

function toFileNameLowerCase(x: string) {
    return fileNameLowerCaseRegExp.test(x) ?
        x.replace(fileNameLowerCaseRegExp, toLowerCase) :
        x;
}

export function getLocaleTimeString() {
    return new Date().toLocaleTimeString()
}

export function getPlainDiagnosticFollowingNewLines(diagnostic: ts.Diagnostic, newLine: string): string {
    return contains(screenStartingMessageCodes, diagnostic.code)
        ? newLine + newLine
        : newLine;
}

const screenStartingMessageCodes: number[] = [
    6031,
    6032,
];
