export type ValidationRule<T = any> = {
  validate: (value: any) => boolean;
  message: string | ((value: any, fieldName: string) => string);
};

export type SchemaField<T = any> = {
  type: "string" | "number" | "boolean" | "object" | "array" | "any";
  required?: boolean;
  nullable?: boolean;
  rules?: ValidationRule[];
  transform?: (value: any) => T;
  default?: T | (() => T);
  fields?: SchemaDefinition;
  items?: SchemaField;
};

export type SchemaDefinition = {
  [key: string]: SchemaField;
};

export type ValidationError = {
  field: string;
  message: string;
  value: any;
};

export type ValidationResult<T = any> = {
  valid: boolean;
  errors: ValidationError[];
  data: T | null;
};
