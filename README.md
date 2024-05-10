# lupos.compiler


## About

**lupos.compiler** is a Typescript Transformer helps to compile [lupos.js](https://github.com/pucelle/lupos.js) based projects.


## Features

- Compile html`...` and svg`...` to a compiled object.
- Compile css`...` to unfold selector nest.
- Compile `@watch` and `@computed` to non-decorator codes and track them.
- Insert codes like `DependencyTracker.onGet(object, property)` to track dependent properties.
- Insert codes like `DependencyTracker.onSet(object, property)` to notify tracked properties have changed.
- Compile `:ref=${this.value}` to `:ref=${(v) => this.value=v]}`, and `:ref.el=${this.value}` to `:ref=${(v) => this.value=v.el]}`
- Try to compile `:class=xxx` and `:style=xxx` to several static update processes, and remove modifiers.
- Compile functions in slots to be static functions, pass required parameters to them.
- Compile `:class` to import `ClassBinding`.
- Compile `:transition.local` to be included in `c` and `l`.
- If knows a TemplateSlot will never include parts, exclude it from `parts`, and try to replace it with innerHTML and textContent.
- For `onCreated`, `onReady`, `onUpdated`, `onConnected`, `onDisconnect`, call `super.onXXX()` except it's empty function.
- Replace initRootContentSlot

## License

MIT