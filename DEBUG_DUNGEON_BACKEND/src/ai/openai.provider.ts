import {
  AiProviderMalformedResponseError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  type AiProvider,
  type StructuredGenerationRequest,
} from "./ai-provider.js";

type OpenAiOutputContent = {
  type?: unknown;
  text?: unknown;
};

type OpenAiOutputItem = {
  type?: unknown;
  content?: unknown;
};

type OpenAiResponseBody = {
  output_text?: unknown;
  output?: unknown;
};

const getTimeoutMs = () => {
  const configuredTimeout = Number(process.env.OPENAI_TIMEOUT_MS ?? 30_000);

  return Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : 30_000;
};

const extractOutputText = (body: OpenAiResponseBody) => {
  if (typeof body.output_text === "string" && body.output_text.length > 0) {
    return body.output_text;
  }

  if (!Array.isArray(body.output)) {
    return null;
  }

  const textParts: string[] = [];

  for (const item of body.output as OpenAiOutputItem[]) {
    if (item.type !== "message" || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content as OpenAiOutputContent[]) {
      if (content.type === "output_text" && typeof content.text === "string") {
        textParts.push(content.text);
      }
    }
  }

  return textParts.length > 0 ? textParts.join("") : null;
};

export const openAiProvider: AiProvider = {
  generateStructured: async (request: StructuredGenerationRequest) => {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;

    if (!apiKey || !model) {
      throw new AiProviderUnavailableError();
    }

    const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1")
      .replace(/\/$/, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

    try {
      const response = await fetch(`${baseUrl}/responses`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          instructions: request.systemPrompt,
          input: JSON.stringify(request.input),
          store: false,
          text: {
            format: {
              type: "json_schema",
              name: request.schemaName,
              strict: true,
              schema: request.jsonSchema,
            },
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new AiProviderUnavailableError();
      }

      let body: OpenAiResponseBody;

      try {
        body = (await response.json()) as OpenAiResponseBody;
      } catch {
        throw new AiProviderMalformedResponseError();
      }

      const outputText = extractOutputText(body);

      if (!outputText) {
        throw new AiProviderMalformedResponseError();
      }

      return outputText;
    } catch (error) {
      if (error instanceof AiProviderMalformedResponseError) {
        throw error;
      }

      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        throw new AiProviderTimeoutError();
      }

      if (error instanceof AiProviderUnavailableError) {
        throw error;
      }

      throw new AiProviderUnavailableError();
    } finally {
      clearTimeout(timeout);
    }
  },
};
