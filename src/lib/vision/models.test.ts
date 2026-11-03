import { describe, expect, it } from "vitest";
import { AI_MODELS, DEFAULT_AI_MODEL, isAiModel, validApiKey } from "./models";

describe("modelos y clave de IA", () => {
  it("solo se aceptan los modelos de la lista y el predeterminado está en ella", () => {
    expect(isAiModel(DEFAULT_AI_MODEL)).toBe(true);
    expect(AI_MODELS.map((m) => m.id)).toContain("claude-haiku-5-5");
    expect(isAiModel("gpt-5")).toBe(false);
    expect(isAiModel("claude-sonnet-5-5-20260401")).toBe(false);
    expect(isAiModel(undefined)).toBe(false);
  });
  it("la clave debe parecer de Anthropic; se recortan espacios", () => {
    const ok = "sk-ant-api03-" + "a".repeat(30);
    expect(validApiKey(`  ${ok}\n`)).toBe(ok);
    expect(validApiKey("sk-ant-corta")).toBeNull();
    expect(validApiKey("sk-proj-" + "a".repeat(30))).toBeNull();
    expect(validApiKey("sk-ant-api03-" + "a b ".repeat(10))).toBeNull();
    expect(validApiKey("")).toBeNull();
  });
});
