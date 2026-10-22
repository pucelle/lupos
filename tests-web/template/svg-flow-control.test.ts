import {describe, expect, it} from 'vitest'
import {SlotPosition, TemplateSlot} from 'lupos.html'
import {UpdateQueue} from '../../web/out'
import {TestSVGFlowControl} from '../../tests/out/template/flow-control/svg.js'


/** Compiled fixtures exercise extraction and real DOM namespace creation together. */
type RenderMethod = Extract<keyof TestSVGFlowControl, `test${string}`>

/** AfterContent is a stable wire value; the runtime's const enum is erased from JS. */
const AFTER_CONTENT = 0

/** Method, branch value, and the elements expected after rendering. */
const CASES: [RenderMethod, number, string[]][] = [
	['testFor', 1, ['for']],
	['testIf', 1, ['if']],
	['testIf', 2, ['elseif']],
	['testIf', 3, ['else']],
	['testCachedIf', 1, ['cached-if']],
	['testCachedIf', 2, ['cached-else']],
	['testSwitch', 1, ['case']],
	['testSwitch', 2, ['default']],
	['testCachedSwitch', 1, ['cached-case']],
	['testCachedSwitch', 2, ['cached-default']],
	['testKeyedAndCache', 1, ['keyed', 'cache']],
	['testAwait', 1, ['await']],
	['testNested', 1, ['nested-if', 'nested-await']],
	['testSVGTemplate', 1, ['svg-literal']],
	['testMultipleRoots', 1, ['first-svg', 'following-line']],
	['testForeignObject', 1, ['html-for', 'html-if', 'html-await', 'svg-reentry']],
	['testForeignObject', 0, ['html-for', 'html-else', 'html-await', 'svg-reentry']],
]


describe('Compiled flow-control namespaces', () => {
	it.each(CASES)('%s branch %s', async (method, value, cases) => {
		let component = new TestSVGFlowControl()
		let container = document.createElement('div')
		let slot = new TemplateSlot(new SlotPosition(AFTER_CONTENT, container), null)
		component.value = value
		slot.afterConnectCallback(0)

		try {
			slot.update(component[method]())
			await UpdateQueue.waitSeveralTicks()
			await UpdateQueue.untilComplete()

			let elements = [...container.querySelectorAll('[data-case]')]
			expect(elements.map(element => element.getAttribute('data-case')).sort()).toEqual([...cases].sort())

			for (let element of elements) {
				let name = element.getAttribute('data-case')!
				let namespace = name.startsWith('html-')
					? 'http://www.w3.org/1999/xhtml'
					: 'http://www.w3.org/2000/svg'

				expect(element.namespaceURI, name).toBe(namespace)
			}

			if (method === 'testFor') {
				expect(container.querySelector('[data-case="for"]')?.getAttribute('x1')).toBe('1')
			}
		}
		finally {
			await slot.beforeDisconnectCallback(0)
		}
	})
})
