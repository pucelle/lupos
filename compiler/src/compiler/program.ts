const resetEscapeSequence = "\u001b[0m";


export enum ForegroundColorEscapeSequences {
    Grey = "\u001b[90m",
}

export function formatColorAndReset(text: string, formatStyle: string) {
    return formatStyle + text + resetEscapeSequence;
}
