import { z } from "zod";

export const MAX_SERIALIZED_OBJECT_BYTES = 32 * 1024 * 1024;

function addWithinLimit(current: number, addition: number) {
  const total = current + addition;
  return total > MAX_SERIALIZED_OBJECT_BYTES ? MAX_SERIALIZED_OBJECT_BYTES + 1 : total;
}

function serializedStringByteLength(value: string) {
  let byteLength = 2;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit === 0x22 || codeUnit === 0x5c
      || codeUnit === 0x08 || codeUnit === 0x09
      || codeUnit === 0x0a || codeUnit === 0x0c
      || codeUnit === 0x0d) {
      byteLength = addWithinLimit(byteLength, 2);
    } else if (codeUnit < 0x20) {
      byteLength = addWithinLimit(byteLength, 6);
    } else if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
        byteLength = addWithinLimit(byteLength, 4);
        index += 1;
      } else {
        byteLength = addWithinLimit(byteLength, 6);
      }
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      byteLength = addWithinLimit(byteLength, 6);
    } else if (codeUnit <= 0x7f) {
      byteLength = addWithinLimit(byteLength, 1);
    } else if (codeUnit <= 0x7ff) {
      byteLength = addWithinLimit(byteLength, 2);
    } else {
      byteLength = addWithinLimit(byteLength, 3);
    }

    if (byteLength > MAX_SERIALIZED_OBJECT_BYTES) {
      return byteLength;
    }
  }
  return byteLength;
}

export function serializedJsonByteLength(value: unknown): number {
  if (value === null) {
    return 4;
  }
  if (typeof value === "string") {
    return serializedStringByteLength(value);
  }
  if (typeof value === "number") {
    return Buffer.byteLength(JSON.stringify(value) ?? "null", "utf8");
  }
  if (typeof value === "boolean") {
    return value ? 4 : 5;
  }
  if (Array.isArray(value)) {
    let byteLength = 2;
    for (let index = 0; index < value.length; index += 1) {
      byteLength = addWithinLimit(byteLength, index === 0 ? 0 : 1);
      byteLength = addWithinLimit(byteLength, serializedJsonByteLength(value[index]));
      if (byteLength > MAX_SERIALIZED_OBJECT_BYTES) {
        return byteLength;
      }
    }
    return byteLength;
  }
  if (typeof value === "object") {
    let byteLength = 2;
    let first = true;
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) {
        continue;
      }
      byteLength = addWithinLimit(byteLength, first ? 0 : 1);
      byteLength = addWithinLimit(byteLength, serializedStringByteLength(key));
      byteLength = addWithinLimit(byteLength, 1);
      byteLength = addWithinLimit(byteLength, serializedJsonByteLength(item));
      if (byteLength > MAX_SERIALIZED_OBJECT_BYTES) {
        return byteLength;
      }
      first = false;
    }
    return byteLength;
  }
  return 0;
}

export function withSerializedObjectLimit<T extends z.ZodType>(schema: T) {
  return schema.superRefine((value, context) => {
    const byteLength = serializedJsonByteLength(value);
    if (byteLength > MAX_SERIALIZED_OBJECT_BYTES) {
      context.addIssue({
        code: "custom",
        message: `Serialized JSON object exceeds ${MAX_SERIALIZED_OBJECT_BYTES} bytes.`,
      });
    }
  });
}
