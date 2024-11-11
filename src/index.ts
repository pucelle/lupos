import type TS from 'typescript'
import type {TransformerExtras, PluginConfig} from 'ts-patch'
import {transformer} from './core'
import './ff'
import './lupos.js'
import './template'


export default function(program: TS.Program, _pluginConfig: PluginConfig, extras: TransformerExtras) {
	return transformer(program, extras)
}
