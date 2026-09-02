import ts from 'typescript'


export interface SourceFilePrepass {
	initialize?(sourceFile: ts.SourceFile): void
	enter(node: ts.Node): void
	leave?(node: ts.Node): void
	complete?(sourceFile: ts.SourceFile): void
}


const SourceFilePrepasses: SourceFilePrepass[] = []


/** Register work to perform during the shared source-file prepass. */
export function defineSourceFilePrepass(prepass: SourceFilePrepass) {
	SourceFilePrepasses.push(prepass)
}


/** Build all source indexes that must be ready before the transforming visit. */
export function runSourceFilePrepass(sourceFile: ts.SourceFile) {
	for (let prepass of SourceFilePrepasses) {
		prepass.initialize?.(sourceFile)
	}

	function visitor(node: ts.Node) {
		for (let prepass of SourceFilePrepasses) {
			prepass.enter(node)
		}

		ts.forEachChild(node, visitor)

		for (let prepass of SourceFilePrepasses) {
			prepass.leave?.(node)
		}
	}

	visitor(sourceFile)

	for (let prepass of SourceFilePrepasses) {
		prepass.complete?.(sourceFile)
	}
}
