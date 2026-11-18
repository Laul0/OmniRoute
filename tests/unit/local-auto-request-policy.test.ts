import assert from "node:assert/strict";
import { test } from "node:test";
import {
  prepareAutoMediaHistory,
  selectPracticalCapacity,
} from "../../open-sse/services/combo/autoRequestPolicy.ts";

test("old images are omitted from a coding request copy, but preserved for image follow-ups", () => {
  const image = { type: "image_url", image_url: { url: "data:image/png;base64,abc" } };
  const history = [
    { role: "user", content: [{ type: "text", text: "Describe this." }, image] },
    { role: "assistant", content: "A screen." },
  ];
  const coding = {
    messages: [...history, { role: "user", content: "Now modify the TypeScript implementation." }],
  };
  const output = prepareAutoMediaHistory(coding);
  assert.notEqual(output, coding);
  assert.doesNotMatch(JSON.stringify(output), /image_url/);
  assert.match(JSON.stringify(coding), /image_url/);
  assert.match(JSON.stringify(output), /Describe this/);
  const followup = {
    messages: [
      ...history,
      { role: "user", content: "Look again at the previous image and explain the navigation." },
    ],
  };
  assert.equal(prepareAutoMediaHistory(followup), followup);
  const current = { messages: [...history.slice(0, 1)] };
  assert.equal(prepareAutoMediaHistory(current), current);
});

test("capacity boundaries distinguish normal, expanded, and oversized input", () => {
  const thresholds = { normal: 24_000, large: 45_000 };
  for (const [tokens, expected] of [
    [23_999, "normal"],
    [24_000, "normal"],
    [24_001, "large"],
    [45_000, "large"],
    [45_001, "oversized"],
  ] as const) {
    assert.equal(selectPracticalCapacity(tokens, thresholds), expected);
  }
});
