export const DEFAULT_PRACTICAL_CAPACITY = { normal: 24_000, large: 45_000 };

export function getPracticalCapacityConfig(name: string, configured: unknown) {
  if (isRecord(configured)) {
    const { normal, large } = configured;
    if (
      typeof normal === "number" &&
      typeof large === "number" &&
      Number.isSafeInteger(normal) &&
      Number.isSafeInteger(large) &&
      normal > 0 &&
      large > normal
    ) {
      return { normal, large };
    }
  }
  return name === "local-auto" ? DEFAULT_PRACTICAL_CAPACITY : null;
}

export function selectPracticalCapacity(
  tokens: number,
  thresholds: typeof DEFAULT_PRACTICAL_CAPACITY
): "normal" | "large" | "oversized" {
  if (tokens > thresholds.large) return "oversized";
  return tokens > thresholds.normal ? "large" : "normal";
}

const imageParts = new Set(["image_url", "input_image", "image"]);
const historicalImageReference =
  /(?:\b(?:previous|earlier|above|last|that)\s+(?:image|picture|screenshot|photo)\b|\b(?:image|picture|screenshot|photo)\s+(?:again|above|earlier)\b|\b(?:image|photo|capture d['’]écran)\s+(?:précédente|ci-dessus|d'avant)\b)/iu;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isImagePart(part: unknown): boolean {
  return isRecord(part) && typeof part.type === "string" && imageParts.has(part.type);
}

export function prepareAutoMediaHistory(body: Record<string, unknown>): Record<string, unknown> {
  const field = Array.isArray(body.messages)
    ? "messages"
    : Array.isArray(body.input)
      ? "input"
      : null;
  if (!field) return body;
  const messages = body[field];
  if (!Array.isArray(messages)) return body;
  const lastUser = messages.findLastIndex(
    (message) => isRecord(message) && message.role === "user"
  );
  if (lastUser < 1) return body;
  const content = messages[lastUser].content;
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
            .join(" ")
        : "";
  if (
    (Array.isArray(content) && content.some(isImagePart)) ||
    historicalImageReference.test(text)
  ) {
    return body;
  }
  let changed = false;
  const projected = messages.map((message, index) => {
    if (index >= lastUser || !isRecord(message) || !Array.isArray(message.content)) return message;
    const remaining = message.content.filter((part) => !isImagePart(part));
    if (remaining.length === message.content.length) return message;
    changed = true;
    return { ...message, content: remaining.length ? remaining : "[Earlier image omitted]" };
  });
  return changed ? { ...body, [field]: projected } : body;
}
