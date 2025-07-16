
//// From https://github.com/microsoft/TypeScript/blob/main/src/compiler/watch.ts


interface MapLike<T> {
    [index: string]: T;
}

type EqualityComparer<T> = (a: T, b: T) => boolean;

export function hasProperty(map: MapLike<any>, key: string): boolean {
    return hasOwnProperty.call(map, key);
}

const hasOwnProperty = Object.prototype.hasOwnProperty;

export function contains<T>(array: readonly T[] | undefined, value: T, equalityComparer: EqualityComparer<T> = equateValues): boolean {
    if (array) {
        for (const v of array) {
            if (equalityComparer(v, value)) {
                return true;
            }
        }
    }
    return false;
}

function equateValues<T>(a: T, b: T) {
    return a === b;
}
