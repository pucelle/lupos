import type ts from 'typescript'
import type {TransformerExtras, PluginConfig} from 'ts-patch'
import './ff'
import './lupos.js'
import {transformer} from './base'


export default function(program: ts.Program, _pluginConfig: PluginConfig, extras: TransformerExtras) {
	return transformer(program, extras)
}
