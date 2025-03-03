import { ValidationRule } from "./types";

export const rules = {
  string: {
    min: (length: number): ValidationRule<string> => ({
      validate: (value) => typeof value === "string" && value.length >= length,
      message: (value, field) =>
        `${field} must be at least ${length} characters long`,
    }),

    max: (length: number): ValidationRule<string> => ({
      validate: (value) => typeof value === "string" && value.length <= length,
      message: (value, field) =>
        `${field} must be at most ${length} characters long`,
    }),

    pattern: (
      regex: RegExp,
      customMessage?: string
    ): ValidationRule<string> => ({
      validate: (value) => typeof value === "string" && regex.test(value),
      message:
        customMessage ||
        ((value, field) => `${field} does not match the required pattern`),
    }),

    email: (): ValidationRule<string> => ({
      validate: (value) => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return typeof value === "string" && emailRegex.test(value);
      },
      message: (value, field) => `${field} must be a valid email address`,
    }),

    url: (): ValidationRule<string> => ({
      validate: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message: (value, field) => `${field} must be a valid URL`,
    }),

    oneOf: (options: string[]): ValidationRule<string> => ({
      validate: (value) => options.includes(value),
      message: (value, field) =>
        `${field} must be one of: ${options.join(", ")}`,
    }),
  },

  number: {
    min: (limit: number): ValidationRule<number> => ({
      validate: (value) => typeof value === "number" && value >= limit,
      message: (value, field) => `${field} must be at least ${limit}`,
    }),

    max: (limit: number): ValidationRule<number> => ({
      validate: (value) => typeof value === "number" && value <= limit,
      message: (value, field) => `${field} must be at most ${limit}`,
    }),

    positive: (): ValidationRule<number> => ({
      validate: (value) => typeof value === "number" && value > 0,
      message: (value, field) => `${field} must be positive`,
    }),

    negative: (): ValidationRule<number> => ({
      validate: (value) => typeof value === "number" && value < 0,
      message: (value, field) => `${field} must be negative`,
    }),

    integer: (): ValidationRule<number> => ({
      validate: (value) => typeof value === "number" && Number.isInteger(value),
      message: (value, field) => `${field} must be an integer`,
    }),

    oneOf: (options: number[]): ValidationRule<number> => ({
      validate: (value) => options.includes(value),
      message: (value, field) =>
        `${field} must be one of: ${options.join(", ")}`,
    }),
  },

  array: {
    min: (length: number): ValidationRule<any[]> => ({
      validate: (value) => Array.isArray(value) && value.length >= length,
      message: (value, field) =>
        `${field} must contain at least ${length} items`,
    }),

    max: (length: number): ValidationRule<any[]> => ({
      validate: (value) => Array.isArray(value) && value.length <= length,
      message: (value, field) =>
        `${field} must contain at most ${length} items`,
    }),

    unique: <T>(keyFn?: (item: T) => any): ValidationRule<T[]> => ({
      validate: (value) => {
        if (!Array.isArray(value)) return false;

        if (keyFn) {
          const keys = new Set();
          for (const item of value) {
            const key = keyFn(item);
            if (keys.has(key)) return false;
            keys.add(key);
          }
          return true;
        } else {
          const jsonItems = value.map((item) => JSON.stringify(item));
          return new Set(jsonItems).size === jsonItems.length;
        }
      },
      message: (value, field) => `${field} must contain unique items`,
    }),
  },

  object: {
    hasKeys: (keys: string[]): ValidationRule<object> => ({
      validate: (value) => {
        if (typeof value !== "object" || value === null) return false;
        return keys.every((key) =>
          Object.prototype.hasOwnProperty.call(value, key)
        );
      },
      message: (value, field) =>
        `${field} must have the following keys: ${keys.join(", ")}`,
    }),
  },

  custom: (
    validationFn: (value: any) => boolean,
    message: string | ((value: any, field: string) => string)
  ): ValidationRule => ({
    validate: validationFn,
    message,
  }),
};
