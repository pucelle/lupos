import {setContext, useContext} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class Parent extends Component {

	@setContext	prop: number = 1
}

class Child extends Component {

	@useContext prop!: number
}