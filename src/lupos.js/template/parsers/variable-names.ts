export namespace VariableNames {

	export const context = '$context'
	export const values = '$values'

	export function getMakerName(index: number) {
		return `$maker_` + index
	}
}