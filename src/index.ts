import type ts from 'typescript'
import type {TransformerExtras, PluginConfig} from 'ts-patch'
import {applyVisitors, setGlobal, setTransformContext, setSourceFile, modifier} from './base'
import {observableVisitor} from './ff'
import './ff'
import './lupos.js'
import {transformer} from './base'


export default function(program: ts.Program, _pluginConfig: PluginConfig, extras: TransformerExtras) {
	return transformer
}
