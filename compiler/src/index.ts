import ts from 'typescript';
import {executeCommandLine} from './compiler';
const transformer = require('../../transformer/out/index');


executeCommandLine(ts.sys, process.argv.slice(2), [transformer.default]);
