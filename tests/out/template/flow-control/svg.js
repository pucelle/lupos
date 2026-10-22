import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, ForBlock, CacheableIfBlock, CacheableSwitchBlock, KeyedBlock, CacheBlock, AwaitBlock } from 'lupos.html';
import { trackGet } from "lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<svg><!--a7648d66--></svg>");
/*
<root>
    <svg>
        <lu:for ${{value}} of ${this.items} key="id" />
    </svg>
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("a7648d66");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("a7648d66"));
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateKey("id");
    $block_0.updateRenderFn(function ({ value }) {
        return new CompiledTemplateResult($template_1, [
            value
        ], $context);
    });
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.updateData($values[0]);
        },
        parts: [
            [$slot_0, 0],
            [$block_0, 0]
        ]
    };
});
const $html_1 = /*#__PURE__*/ new HTMLMaker("<svg><line data-case=\"for\"></line></svg>", true);
/*
<root>
    <svg>
        <line data-case="for" x1=${value} />
    </svg>
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $values[0] === null ? $node_0.removeAttribute("x1") : $node_0.setAttribute("x1", $values[0]);
                $latest_0 = $values[0];
            }
        }
    };
});
const $html_2 = /*#__PURE__*/ new HTMLMaker("<svg><!--bcaf16e9--></svg>");
/*
<root>
    <svg>
        <lu:if ${this.value === 1} />
    </svg>
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_2.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("bcaf16e9");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0, $locator.getNodes("bcaf16e9"));
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $slot_0.update($values[0]);
        },
        parts: [
            [$slot_0, 0]
        ]
    };
});
const $html_3 = /*#__PURE__*/ new HTMLMaker("<svg><line data-case=\"if\"></line></svg>", true);
/*
<root>
    <svg>
        <line data-case="if" />
    </svg>
</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_3.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_4 = /*#__PURE__*/ new HTMLMaker("<svg><circle data-case=\"elseif\"></circle></svg>", true);
/*
<root>
    <svg>
        <circle data-case="elseif" />
    </svg>
</root>
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_4.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_5 = /*#__PURE__*/ new HTMLMaker("<svg><path data-case=\"else\"></path></svg>", true);
/*
<root>
    <svg>
        <path data-case="else" />
    </svg>
</root>
*/ const $template_5 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_5.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_6 = /*#__PURE__*/ new HTMLMaker("<svg><!--011ca6b2--></svg>");
/*
<root>
    <svg>
        <lu:if ${this.value === 1} cache />
    </svg>
</root>
*/ const $template_6 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_6.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("011ca6b2");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0, $locator.getNodes("011ca6b2"));
    let $block_0 = new CacheableIfBlock($slot_0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 0]
        ]
    };
});
const $html_7 = /*#__PURE__*/ new HTMLMaker("<svg><line data-case=\"cached-if\"></line></svg>", true);
/*
<root>
    <svg>
        <line data-case="cached-if" />
    </svg>
</root>
*/ const $template_7 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_7.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_8 = /*#__PURE__*/ new HTMLMaker("<svg><path data-case=\"cached-else\"></path></svg>", true);
/*
<root>
    <svg>
        <path data-case="cached-else" />
    </svg>
</root>
*/ const $template_8 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_8.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_9 = /*#__PURE__*/ new HTMLMaker("<svg><!--b8f8bfcb--></svg>");
/*
<root>
    <svg>
        <lu:switch ${this.value} />
    </svg>
</root>
*/ const $template_9 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_9.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("b8f8bfcb");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0, $locator.getNodes("b8f8bfcb"));
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $slot_0.update($values[0]);
        },
        parts: [
            [$slot_0, 0]
        ]
    };
});
const $html_10 = /*#__PURE__*/ new HTMLMaker("<svg><line data-case=\"case\"></line></svg>", true);
/*
<root>
    <svg>
        <line data-case="case" />
    </svg>
</root>
*/ const $template_10 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_10.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_11 = /*#__PURE__*/ new HTMLMaker("<svg><path data-case=\"default\"></path></svg>", true);
/*
<root>
    <svg>
        <path data-case="default" />
    </svg>
</root>
*/ const $template_11 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_11.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_12 = /*#__PURE__*/ new HTMLMaker("<svg><!--4bf0e107--></svg>");
/*
<root>
    <svg>
        <lu:switch ${this.value} cache />
    </svg>
</root>
*/ const $template_12 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_12.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("4bf0e107");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0, $locator.getNodes("4bf0e107"));
    let $block_0 = new CacheableSwitchBlock($slot_0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 0]
        ]
    };
});
const $html_13 = /*#__PURE__*/ new HTMLMaker("<svg><line data-case=\"cached-case\"></line></svg>", true);
/*
<root>
    <svg>
        <line data-case="cached-case" />
    </svg>
</root>
*/ const $template_13 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_13.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_14 = /*#__PURE__*/ new HTMLMaker("<svg><path data-case=\"cached-default\"></path></svg>", true);
/*
<root>
    <svg>
        <path data-case="cached-default" />
    </svg>
</root>
*/ const $template_14 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_14.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_15 = /*#__PURE__*/ new HTMLMaker("<svg><!--e6aeb39e--><!--46cd6db4--></svg>");
/*
<root>
    <svg>
        <lu:keyed ${this.value} />
        <lu:cache />
    </svg>
</root>
*/ const $template_15 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_15.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("e6aeb39e");
    let $node_2 = $locator.getMarker("46cd6db4");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0, $locator.getNodes("e6aeb39e"));
    let $block_0 = new KeyedBlock($slot_0);
    let $slot_1 = new TemplateSlot(new SlotPosition(1, $node_2), 0, $locator.getNodes("46cd6db4"));
    let $block_1 = new CacheBlock($slot_1);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0], $values[1]);
            $block_1.update($values[2]);
        },
        parts: [
            [$slot_0, 0],
            [$slot_1, 0]
        ]
    };
});
const $html_16 = /*#__PURE__*/ new HTMLMaker("<svg><line data-case=\"keyed\"></line></svg>", true);
/*
<root>
    <svg>
        <line data-case="keyed" />
    </svg>
</root>
*/ const $template_16 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_16.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_17 = /*#__PURE__*/ new HTMLMaker("<svg><circle data-case=\"cache\"></circle></svg>", true);
/*
<root>
    <svg>
        <circle data-case="cache" />
    </svg>
</root>
*/ const $template_17 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_17.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_18 = /*#__PURE__*/ new HTMLMaker("<svg><!--df1e2f48--></svg>");
/*
<root>
    <svg>
        <lu:await ${this.promise} />
    </svg>
</root>
*/ const $template_18 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_18.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("df1e2f48");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("df1e2f48"));
    let $block_0 = new AwaitBlock($template_19, $slot_0, $context);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0], $values);
        },
        parts: [
            [$slot_0, 0]
        ]
    };
});
const $html_19 = /*#__PURE__*/ new HTMLMaker("<svg><line data-case=\"await\"></line></svg>", true);
/*
<root>
    <svg>
        <line data-case="await" />
    </svg>
</root>
*/ const $template_19 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_19.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_20 = /*#__PURE__*/ new HTMLMaker("<svg><!--b1aa14f8--></svg>");
/*
<root>
    <svg>
        <lu:for ${{value}} of ${this.items} />
    </svg>
</root>
*/ const $template_20 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_20.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("b1aa14f8");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("b1aa14f8"));
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn(function ({ value }) {
        return new CompiledTemplateResult($template_21, [
            (trackGet($context, "promise"), value) ? new CompiledTemplateResult($template_22, [], $context) : new CompiledTemplateResult($template_23, [], $context),
            $context.promise
        ], $context);
    });
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.updateData($values[0]);
        },
        parts: [
            [$slot_0, 0],
            [$block_0, 0]
        ]
    };
});
const $html_21 = /*#__PURE__*/ new HTMLMaker("<svg><g><!--6d04ae43--><!--16ab936d--></g></svg>", true);
/*
<root>
    <svg>
        <g>
            <lu:if ${value} />
            <lu:await ${this.promise} />
        </g>
    </svg>
</root>
*/ const $template_21 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_21.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("6d04ae43");
    let $node_2 = $locator.getMarker("16ab936d");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0, $locator.getNodes("6d04ae43"));
    let $slot_1 = new TemplateSlot(new SlotPosition(1, $node_2), null, $locator.getNodes("16ab936d"));
    let $block_0 = new AwaitBlock($template_24, $slot_1, $context);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $slot_0.update($values[0]);
            $block_0.update($values[1], $values);
        },
        parts: [
            [$slot_0, 0],
            [$slot_1, 0]
        ]
    };
});
const $html_22 = /*#__PURE__*/ new HTMLMaker("<svg><line data-case=\"nested-if\"></line></svg>", true);
/*
<root>
    <svg>
        <line data-case="nested-if" />
    </svg>
</root>
*/ const $template_22 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_22.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_23 = /*#__PURE__*/ new HTMLMaker("<svg><path data-case=\"nested-else\"></path></svg>", true);
/*
<root>
    <svg>
        <path data-case="nested-else" />
    </svg>
</root>
*/ const $template_23 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_23.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_24 = /*#__PURE__*/ new HTMLMaker("<svg><circle data-case=\"nested-await\"></circle></svg>", true);
/*
<root>
    <svg>
        <circle data-case="nested-await" />
    </svg>
</root>
*/ const $template_24 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_24.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_25 = /*#__PURE__*/ new HTMLMaker("<svg><!----><!--7597ee62--></svg>", true);
/*
<root>
    <svg>
        <lu:if ${this.value} />
    </svg>
</root>
*/ const $template_25 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_25.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("7597ee62");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("7597ee62"));
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $slot_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_26 = /*#__PURE__*/ new HTMLMaker("<svg><line data-case=\"svg-literal\"></line></svg>", true);
/*
<root>
    <svg>
        <line data-case="svg-literal" />
    </svg>
</root>
*/ const $template_26 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_26.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_27 = /*#__PURE__*/ new HTMLMaker("<svg><!----><!--ed918bc1--></svg>", true);
/*
<root>
    <svg>
        <lu:cache />
    </svg>
</root>
*/ const $template_27 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_27.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("ed918bc1");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0, $locator.getNodes("ed918bc1"));
    let $block_0 = new CacheBlock($slot_0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_28 = /*#__PURE__*/ new HTMLMaker("<svg><svg data-case=\"first-svg\"></svg><line data-case=\"following-line\"></line></svg>", true);
/*
<root>
    <svg>
        <svg data-case="first-svg" />
        <line data-case="following-line" />
    </svg>
</root>
*/ const $template_28 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_28.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_29 = /*#__PURE__*/ new HTMLMaker("<svg><foreignObject><!--3e20b07e--><!--8264225b--><!--8c4d5a08--><svg><!--5646f0b0--></svg></foreignObject></svg>", true);
/*
<root>
    <svg>
        <foreignObject>
            <lu:for ${{value}} of ${this.items} />
            <lu:if ${this.value} />
            <lu:await ${this.promise} />
            <svg>
                <lu:keyed ${this.value} />
            </svg>
        </foreignObject>
    </svg>
</root>
*/ const $template_29 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_29.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("3e20b07e");
    let $node_2 = $locator.getMarker("8264225b");
    let $node_3 = $locator.getMarker("8c4d5a08");
    let $node_4 = $locator.getMarker("5646f0b0");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("3e20b07e"));
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn(function ({ value }) {
        return new CompiledTemplateResult($template_30, [
            value
        ], $context);
    });
    let $slot_1 = new TemplateSlot(new SlotPosition(1, $node_2), 0, $locator.getNodes("8264225b"));
    let $slot_2 = new TemplateSlot(new SlotPosition(1, $node_3), null, $locator.getNodes("8c4d5a08"));
    let $block_1 = new AwaitBlock($template_33, $slot_2, $context);
    let $slot_3 = new TemplateSlot(new SlotPosition(1, $node_4), 0, $locator.getNodes("5646f0b0"));
    let $block_2 = new KeyedBlock($slot_3);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.updateData($values[0]);
            $slot_1.update($values[1]);
            $block_1.update($values[2], $values);
            $block_2.update($values[3], $values[4]);
        },
        parts: [
            [$slot_0, 0],
            [$block_0, 0],
            [$slot_1, 0],
            [$slot_2, 0],
            [$slot_3, 0]
        ]
    };
});
const $html_30 = /*#__PURE__*/ new HTMLMaker("<div data-case=\"html-for\"> </div>");
/*
<root>
    <div data-case="html-for">${value}</div>
</root>
*/ const $template_30 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_30.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $node_0.firstChild;
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_1.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
const $html_31 = /*#__PURE__*/ new HTMLMaker("<div data-case=\"html-if\"></div>");
/*
<root>
    <div data-case="html-if" />
</root>
*/ const $template_31 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_31.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_32 = /*#__PURE__*/ new HTMLMaker("<div data-case=\"html-else\"></div>");
/*
<root>
    <div data-case="html-else" />
</root>
*/ const $template_32 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_32.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_33 = /*#__PURE__*/ new HTMLMaker("<div data-case=\"html-await\"></div>");
/*
<root>
    <div data-case="html-await" />
</root>
*/ const $template_33 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_33.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_34 = /*#__PURE__*/ new HTMLMaker("<svg><line data-case=\"svg-reentry\"></line></svg>", true);
/*
<root>
    <svg>
        <line data-case="svg-reentry" />
    </svg>
</root>
*/ const $template_34 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_34.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
/** Extracted control bodies must retain the namespace of their insertion point. */
export class TestSVGFlowControl extends Component {
    /** Select conditional and switch branches. */
    value = 1;
    /** Destructured keyed items reproduce SVG leader-line rendering. */
    items = [{ id: 'line', value: 1 }];
    /** Await bodies use shared-value subtrees instead of independent templates. */
    promise = new Promise(() => { });
    /** A loop in an HTML template still creates SVG line elements. */
    testFor() {
        trackGet(this, "items");
        trackGet(this.items, "");
        return new CompiledTemplateResult($template_0, [
            this.items
        ], this);
    }
    /** All sibling branches retain SVG context, including detached elseif and else nodes. */
    testIf() {
        trackGet(this, "value");
        return new CompiledTemplateResult($template_2, [
            this.value === 1 ? new CompiledTemplateResult($template_3, [], this) : this.value === 2 ? new CompiledTemplateResult($template_4, [], this) : new CompiledTemplateResult($template_5, [], this)
        ], this);
    }
    /** Cached branches use the same namespace as uncached branches. */
    testCachedIf() {
        trackGet(this, "value");
        return new CompiledTemplateResult($template_6, [
            this.value === 1 ? new CompiledTemplateResult($template_7, [], this) : new CompiledTemplateResult($template_8, [], this)
        ], this);
    }
    /** Switch case and default bodies are extracted separately. */
    testSwitch() {
        trackGet(this, "value");
        return new CompiledTemplateResult($template_9, [
            this.value === 1 ? new CompiledTemplateResult($template_10, [], this) : new CompiledTemplateResult($template_11, [], this)
        ], this);
    }
    /** Cached switch branches must also be parsed as SVG. */
    testCachedSwitch() {
        trackGet(this, "value");
        return new CompiledTemplateResult($template_12, [
            this.value === 1 ? new CompiledTemplateResult($template_13, [], this) : new CompiledTemplateResult($template_14, [], this)
        ], this);
    }
    /** Keyed and cached bodies inherit an enclosing SVG element. */
    testKeyedAndCache() {
        trackGet(this, "value");
        return new CompiledTemplateResult($template_15, [
            this.value,
            new CompiledTemplateResult($template_16, [], this),
            new CompiledTemplateResult($template_17, [], this)
        ], this);
    }
    /** Await subtrees retain SVG context without an enclosing svg-tagged literal. */
    testAwait() {
        trackGet(this, "promise");
        return new CompiledTemplateResult($template_18, [
            this.promise
        ], this);
    }
    /** Namespace context persists through multiple levels of extraction. */
    testNested() {
        trackGet(this, "items");
        trackGet(this.items, "");
        return new CompiledTemplateResult($template_20, [
            this.items
        ], this);
    }
    /** Explicit SVG literals retain their namespace when extracting control content. */
    testSVGTemplate() {
        trackGet(this, "value");
        return new CompiledTemplateResult($template_25, [
            this.value ? new CompiledTemplateResult($template_26, [], this) : null
        ], this);
    }
    /** An existing first SVG root must not leave its following siblings in HTML. */
    testMultipleRoots() {
        return new CompiledTemplateResult($template_27, [
            new CompiledTemplateResult($template_28, [], this)
        ], this);
    }
    /** A foreignObject switches children back to HTML, even inside an SVG template. */
    testForeignObject() {
        trackGet(this, "items", "value", "promise");
        trackGet(this.items, "");
        return new CompiledTemplateResult($template_29, [
            this.items,
            this.value ? new CompiledTemplateResult($template_31, [], this) : new CompiledTemplateResult($template_32, [], this),
            this.promise,
            this.value,
            new CompiledTemplateResult($template_34, [], this)
        ], this);
    }
}
