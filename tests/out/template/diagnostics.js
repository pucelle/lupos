import { Component, ClassBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
const $html_0 = new HTMLMaker("<!---->");
/*
<root>
    <template :class=${true, 'style'} />
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $context.el;
    let $node_1 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    $binding_0.updateString(true);
    return {
        el: $node,
        position: new SlotPosition(1, $node_1)
    };
});
export class TestDiagnostics extends Component {
    // testUnImportedBinding() {
    // 	return html`<template :binding=${true}>`
    // }
    // testUnImportedCom() {
    // 	return html`<Com>`
    // }
    testMultipleBindingParameters() {
        return new CompiledTemplateResult($template_0, []);
    }
}
