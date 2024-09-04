import type TS from 'typescript'
import type {TransformerExtras, PluginConfig} from 'ts-patch'
import {transformer} from './base'
import './ff'
import './lupos.js'


export default function(program: TS.Program, _pluginConfig: PluginConfig, extras: TransformerExtras) {
	return transformer(program, extras)
}
