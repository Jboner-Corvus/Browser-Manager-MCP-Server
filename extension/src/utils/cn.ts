/**
 * Utility function for conditional class names
 * Optimized for performance and TypeScript support
 */

type ClassName = string | number | boolean | undefined | null;
type ClassValue = ClassName | ClassValue[] | Record<string, boolean | undefined | null>;

function toVal(mix: ClassValue): string {
  let str = '';

  if (typeof mix === 'string' || typeof mix === 'number') {
    str += mix;
  } else if (typeof mix === 'object') {
    if (Array.isArray(mix)) {
      for (let i = 0; i < mix.length; i++) {
        if (mix[i]) {
          const val = toVal(mix[i]);
          if (val) {
            str && (str += ' ');
            str += val;
          }
        }
      }
    } else {
      for (const key in mix) {
        if (mix[key]) {
          str && (str += ' ');
          str += key;
        }
      }
    }
  }

  return str;
}

export function cn(...inputs: ClassValue[]): string {
  let i = 0;
  let tmp: string;
  let str = '';
  const len = inputs.length;

  for (; i < len; i++) {
    tmp = toVal(inputs[i]);
    if (tmp) {
      str && (str += ' ');
      str += tmp;
    }
  }

  return str;
}

export default cn;