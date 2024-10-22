import {setContext, useContext} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


export class Parent extends Component {

	@setContext	prop: number = 1
}

export class Child extends Component {

	@useContext prop!: number
}