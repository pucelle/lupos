import ts from 'typescript'
import {getMirrorSemanticService} from './semantic-service'


/** Adapt shared semantic queries for template content classification. */
export function createTemplateTypeQuery(program: ts.Program) {
	let service = getMirrorSemanticService(program)
	return (node: ts.Node) => service.getType(node)
}
