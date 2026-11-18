import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyPromptIntent,
  classifyWithConfig,
} from "../../open-sse/services/intentClassifier.ts";

const classify = (prompt: string) => classifyWithConfig(prompt, { enabled: true });

test("French prose does not trigger embedded coding keywords", () => {
  for (const prompt of [
    "rapidement",
    "important",
    "Microsoft 365 Copilot apporte plusieurs possibilités qui permet aux utilisateurs de travailler plus rapidement, mais il est important de mettre en place une gouvernance avant son déploiement.",
  ]) {
    assert.notEqual(classify(prompt), "code", prompt);
    assert.notEqual(classifyPromptIntent(prompt), "code", prompt);
  }
});

test("writing requests have their own intent", () => {
  for (const prompt of [
    "Réécris",
    "reformule",
    "corrige",
    "résume",
    "rédige",
    "article de blog",
    "courriel",
    "ton professionnel",
    "rewrite",
    "rephrase",
    "proofread",
    "summarize",
    "draft",
    "blog post",
    "release note",
  ]) {
    assert.equal(classify(prompt), "writing", prompt);
    assert.equal(classifyPromptIntent(prompt), "writing", prompt);
  }
});

test("real coding terms and code edits remain coding", () => {
  for (const prompt of [
    "API",
    "import",
    "TypeScript",
    "function",
    "repository",
    "debug",
    "PowerShell",
    "C#",
    "C++",
    ".NET",
    "Node.js",
    "ＡＰＩ",
    "Rewrite this TypeScript function.",
  ]) {
    assert.equal(classify(prompt), "code", prompt);
    assert.equal(classifyPromptIntent(prompt), "code", prompt);
  }
});

test("a prose rewrite takes precedence over technical terms in the text and system instructions", () => {
  assert.equal(
    classifyPromptIntent(
      "Rewrite the TypeScript API explanation as a concise professional French blog section.",
      "You are a coding agent. Use tools to debug the repository when needed."
    ),
    "writing"
  );
});
