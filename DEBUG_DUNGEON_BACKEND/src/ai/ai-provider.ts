export type StructuredGenerationRequest = {
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  systemPrompt: string;
  input: unknown;
};

export interface AiProvider {
  generateStructured(request: StructuredGenerationRequest): Promise<string>;
}

export class AiProviderUnavailableError extends Error {
  constructor() {
    super("AI provider is unavailable");
    this.name = "AiProviderUnavailableError";
  }
}

export class AiProviderTimeoutError extends Error {
  constructor() {
    super("AI provider request timed out");
    this.name = "AiProviderTimeoutError";
  }
}

export class AiProviderMalformedResponseError extends Error {
  constructor() {
    super("AI provider returned a malformed response");
    this.name = "AiProviderMalformedResponseError";
  }
}
