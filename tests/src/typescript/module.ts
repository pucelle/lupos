export interface ModuleValue {
	value: number
}

export const moduleValue: ModuleValue = {value: 1}

export default class ModuleBox {
	constructor(public readonly value: number) {}
}
