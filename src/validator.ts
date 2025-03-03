import {
  SchemaDefinition,
  ValidationResult,
  ValidationError,
  SchemaField,
} from "./types";

export class SmartValidator {
  private schema: SchemaDefinition;
  private transformEnabled: boolean;
  private strictMode: boolean;
  private errorCollectionMode: "first" | "all";

  constructor(
    schema: SchemaDefinition,
    options?: {
      transformEnabled?: boolean;
      strictMode?: boolean;
      errorCollectionMode?: "first" | "all";
    }
  ) {
    this.schema = schema;
    this.transformEnabled = options?.transformEnabled ?? true;
    this.strictMode = options?.strictMode ?? false;
    this.errorCollectionMode = options?.errorCollectionMode ?? "all";
  }

  validate<T = any>(data: any): ValidationResult<T> {
    const errors: ValidationError[] = [];
    const result: any = {};

    for (const fieldName in this.schema) {
      const field = this.schema[fieldName];
      if (
        field.required &&
        (data[fieldName] === undefined ||
          (data[fieldName] === null && !field.nullable))
      ) {
        errors.push({
          field: fieldName,
          message: `Field '${fieldName}' is required`,
          value: undefined,
        });

        if (this.errorCollectionMode === "first" && errors.length > 0) {
          return { valid: false, errors, data: null };
        }
      }
    }

    for (const fieldName in data) {
      if (this.strictMode && !this.schema[fieldName]) {
        errors.push({
          field: fieldName,
          message: `Unknown field '${fieldName}'`,
          value: data[fieldName],
        });

        if (this.errorCollectionMode === "first" && errors.length > 0) {
          return { valid: false, errors, data: null };
        }
        continue;
      }

      if (!this.schema[fieldName]) {
        result[fieldName] = data[fieldName];
        continue;
      }

      const fieldErrors = this.validateField(
        fieldName,
        data[fieldName],
        this.schema[fieldName]
      );
      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors);

        if (this.errorCollectionMode === "first" && errors.length > 0) {
          return { valid: false, errors, data: null };
        }
      } else {
        let value = data[fieldName];

        if (this.transformEnabled && this.schema[fieldName].transform) {
          value = this.schema[fieldName].transform!(value);
        }

        result[fieldName] = value;
      }
    }

    for (const fieldName in this.schema) {
      if (
        result[fieldName] === undefined &&
        this.schema[fieldName].default !== undefined
      ) {
        const defaultValue = this.schema[fieldName].default;
        result[fieldName] =
          typeof defaultValue === "function"
            ? (defaultValue as Function)()
            : defaultValue;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      data: errors.length === 0 ? (result as T) : null,
    };
  }

  private validateField(
    fieldName: string,
    value: any,
    fieldSchema: SchemaField
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (value === null) {
      if (fieldSchema.nullable) {
        return errors;
      } else {
        errors.push({
          field: fieldName,
          message: `Field '${fieldName}' cannot be null`,
          value: null,
        });
        return errors;
      }
    }

    if (value === undefined && !fieldSchema.required) {
      return errors;
    }

    if (!this.validateType(value, fieldSchema)) {
      errors.push({
        field: fieldName,
        message: `Field '${fieldName}' must be of type ${fieldSchema.type}`,
        value,
      });
      return errors;
    }

    if (
      fieldSchema.type === "object" &&
      fieldSchema.fields &&
      typeof value === "object"
    ) {
      const nestedValidator = new SmartValidator(fieldSchema.fields, {
        transformEnabled: this.transformEnabled,
        strictMode: this.strictMode,
        errorCollectionMode: this.errorCollectionMode,
      });

      const nestedResult = nestedValidator.validate(value);
      if (!nestedResult.valid) {
        for (const error of nestedResult.errors) {
          errors.push({
            field: `${fieldName}.${error.field}`,
            message: error.message,
            value: error.value,
          });
        }
      }
    }

    if (
      fieldSchema.type === "array" &&
      fieldSchema.items &&
      Array.isArray(value)
    ) {
      value.forEach((item, index) => {
        if (fieldSchema.items!.type === "object" && fieldSchema.items!.fields) {
          const itemValidator = new SmartValidator(fieldSchema.items!.fields, {
            transformEnabled: this.transformEnabled,
            strictMode: this.strictMode,
            errorCollectionMode: this.errorCollectionMode,
          });

          const itemResult = itemValidator.validate(item);
          if (!itemResult.valid) {
            for (const error of itemResult.errors) {
              errors.push({
                field: `${fieldName}[${index}].${error.field}`,
                message: error.message,
                value: error.value,
              });
            }
          }
        } else {
          const itemErrors = this.validateField(
            `${fieldName}[${index}]`,
            item,
            fieldSchema.items!
          );
          errors.push(...itemErrors);
        }
      });
    }

    if (fieldSchema.rules && fieldSchema.rules.length > 0) {
      for (const rule of fieldSchema.rules) {
        if (!rule.validate(value)) {
          const message =
            typeof rule.message === "function"
              ? rule.message(value, fieldName)
              : rule.message;

          errors.push({
            field: fieldName,
            message,
            value,
          });

          if (this.errorCollectionMode === "first") {
            break;
          }
        }
      }
    }

    return errors;
  }

  private validateType(value: any, fieldSchema: SchemaField): boolean {
    switch (fieldSchema.type) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number" && !isNaN(value);
      case "boolean":
        return typeof value === "boolean";
      case "object":
        return (
          typeof value === "object" && value !== null && !Array.isArray(value)
        );
      case "array":
        return Array.isArray(value);
      case "any":
        return true;
      default:
        return false;
    }
  }
}
