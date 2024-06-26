import type TS from 'typescript'


const Visitors: {
	match: (node: TS.Node) => boolean,
	visit: (node: TS.Node) => TS.Node | TS.Node[] | undefined,
}[] = []


/** 
 * Define a visitor, and push it to visitor list.
 * `visit` will visit each node in depth-first order,
 * so you don't need to visit child nodes in each defined visitor.
 */
export function defineVisitor(
	match: (node: TS.Node) => boolean,
	visit: (node: any) => TS.Node | TS.Node[] | undefined
) {
	Visitors.push({match, visit})
}


/** 
 * Apply defined visitors to a node.
 * Returns old node, or a replaced node, a replaced nodes.
 */
export function applyVisitors(node: TS.Node | undefined): TS.Node[] | undefined {
	let nodes = node ? [node] : []

	for (let visitor of Visitors) {
		let newNodes: TS.Node[] = []
		
		for (let node of nodes) {
			if (visitor.match(node)) {
				let nodeOrArray = visitor.visit(node)

				if (Array.isArray(nodeOrArray)) {
					newNodes.push(...nodeOrArray)
				}
				else if (nodeOrArray) {
					newNodes.push(nodeOrArray)
				}
			}
			else {
				newNodes.push(node)
			}
		}

		nodes = newNodes
	}

	return nodes
}