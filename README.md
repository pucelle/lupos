# lupos.compiler


## About

**lupos.compiler** is a Typescript Transformer helps to compile [lupos.js](https://github.com/pucelle/lupos.js) based projects.


## Features

- Compile `@computed`, `@effect`, `@watch` to non-decorator codes and track them.
- Insert codes like `trackGet(object, ...properties)` to track properties of `Observed` objects.
- Insert codes like `trackSet(object, ...properties)` to notify tracked properties of `Observed` objects have changed.
- Compile html`...` and svg`...` to a compiled object.
- Compile sass like folded selector in css`...` to unfolded.
- Add a `static SlotContentType = xxx` property for component declarations to improve updating rendering performance.
- Optimize some binding codes.


## License

MIT