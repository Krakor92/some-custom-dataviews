/**
 * Builds an inverted map where the values become keys and the keys become values.
 */
export const buildInvertedMap = <K>(
  map: Map<K, string | number>
): Map<string | number, K[]> => {
  const invertedMap = new Map<string | number, K[]>();
  for (const [key, value] of map) {
    if (invertedMap.has(value)) {
      invertedMap.get(value)!.push(key);
    } else {
      invertedMap.set(value, [key]);
    }
  }
  return invertedMap;
};

// Clamp number between two values with the following line:
export const clamp = (num: number, min: number, max: number): number =>
  Math.min(Math.max(num, min), max);

export const closestTo = (low: number, high: number, value: number): number => {
  const diffToLow = Math.abs(value - low);
  const diffToHigh = Math.abs(value - high);

  if (diffToLow < diffToHigh) {
    return low;
  } else if (diffToHigh < diffToLow) {
    return high;
  } else {
    return value; // When the value is equidistant to both low and high
  }
};

export const delay = async (time: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, time));

// export const isObject = (o: unknown): boolean => {
//   return o !== null && typeof o === "object" && !Array.isArray(o);
// };

export const isObject = (o: unknown): o is Record<string, unknown> => {
  return o !== null && typeof o === "object" && !Array.isArray(o);
};

/**
 * Seeded RNG using Linear Congruential Generator
 * @param seed - The seed for the RNG.
 * @returns a function that returns a pseudorandom number between 0 and 1.
 */
const seededRNG = (seed: number): (() => number) => {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
};

/**
 * Shuffles an array in place using a seedable RNG.
 * @from https://stackoverflow.com/a/6274381
 * @param a - The array to shuffle.
 * @param seed - The seed for the RNG.
 */
export const shuffleArray = <T>(a: T[], seed?: number): void => {
  const rng = typeof seed === "number" ? seededRNG(seed) : Math.random;
  let j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(rng() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
};

/**
 * Converts a timecode in the form 00:00:00 or 00:00 to seconds.
 * @param timecode - The timecode string.
 * @returns the timecode converted to seconds, or NaN if invalid.
 */
export const convertTimecodeToDuration = (timecode: string): number => {
  const timeArray = timecode?.split(":");
  if (!timeArray || timeArray.length < 2 || timeArray.length > 3) {
    // It only supports 00:00 or 00:00:00
    return NaN;
  }

  let i = 0;
  let total = 0;
  if (timeArray.length === 3) {
    const hours = parseInt(timeArray[i++], 10);
    if (isNaN(hours)) return NaN;
    total += hours * 3600;
  }

  const minutes = parseInt(timeArray[i++], 10);
  if (isNaN(minutes)) return NaN;
  total += minutes * 60;

  const seconds = parseInt(timeArray[i], 10);
  if (isNaN(seconds)) return NaN;

  return total + seconds;
};

/**
 * Converts a duration in seconds to a timecode string of the format 00:00:00 or 00:00.
 * @param duration - The duration in seconds.
 * @returns the formatted timecode string.
 */
export const convertDurationToTimecode = (duration: number): string => {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);

  const hoursString = hours.toString().padStart(1, "0");
  const minutesString = minutes.toString().padStart(1, "0");
  const secondsString = seconds.toString().padStart(2, "0");

  return hours > 0
    ? `${hoursString}:${minutesString}:${secondsString}`
    : `${minutesString}:${secondsString}`;
};

/**
 * Creates a new regex with the global flag enabled.
 * @param regex - The original regex.
 * @returns A new regex with the global flag enabled.
 */
export const globalizeRegex = (regex: RegExp): RegExp => {
  let regexStr = regex.source; // Get the string representation of the regex

  if (regexStr.startsWith("^")) {
    regexStr = regexStr.slice(1);
  }

  if (regexStr.endsWith("$")) {
    regexStr = regexStr.slice(0, -1);
  }
  return new RegExp(regexStr, "g");
};

/* from: https://stackoverflow.com/a/75988895 */
export const debounce = <T extends unknown[]>(
  callback: (...args: T) => void,
  wait: number = 300
): ((...args: T) => void) => {
  let timeoutId: number | null = null;
  return (...args: T): void => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
};

/**
 * Deep clone a given object.
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== "object") {
    return obj; // Return primitives and null as is
  }

  if (Array.isArray(obj)) {
    const newArray: unknown[] = obj.map((item: unknown) => deepClone(item)); // Clone arrays recursively
    return newArray as T;
  }

  // At this point we're dealing with an object
  // We can duplicate it making sure we keep its prototype intact
  const newObj = Object.create(obj) as T;
  for (const key in obj) {
    // We make sure to ignore properties from the prototype chain
    if (Object.hasOwn(obj, key)) {
      newObj[key] = deepClone(obj[key]);
    }
  }
  return newObj;
};

/**
 * Check if a value is empty.
 * @param value - The value to check.
 * @returns true if the value is empty, false otherwise.
 */
export function isEmpty(value: unknown): boolean {
  if (value == null) {
    // Check for null or undefined
    return true;
  } else if (Array.isArray(value)) {
    // Check for empty array
    return value.length === 0;
  } else if (typeof value === "object") {
    // Check for empty object
    if (Object.prototype.toString.call(value) === "[object Object]") {
      return Object.keys(value).length === 0;
    }
    // Check for other types of objects
    for (const key in value) {
      if (Object.hasOwn(value, key)) {
        return false;
      }
    }
    return true; // If no enumerable properties found
  } else if (typeof value === "string") {
    // Check for empty string
    return value.trim() === "";
  } else if (typeof value === "number" && isNaN(value)) {
    // Check for NaN
    return true;
  }

  return false; // For other types, consider them non-empty
}

/**
 * A naïve deep equality check that handles scalar values, arrays, and objects.
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 * @returns true if the values are equal, false otherwise.
 */
export const isEqual = (a: unknown, b: unknown): boolean => {
  // Handle primitives, null and pointer comparison
  if (a === b) {
    return true;
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  // Handle objects
  if (isObject(a) && isObject(b)) {
    // The two objects do not share the same prototype, they are not equal
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
      return false;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (const key of keysA) {
      if (!keysB.includes(key) || !isEqual(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  // If types are different, they are not equal
  return false;
};
