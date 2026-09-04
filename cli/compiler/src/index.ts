import ts from 'typescript';
import {executeCommandLine} from './compiler';
const transformer = require('../../transformer/out/index');
const mirrorProvider = require('../../transformer/out/mirror-provider');


executeCommandLine(ts.sys, process.argv.slice(2), transformer.default, mirrorProvider.createLuposMirrorDiagnosticProvider);
