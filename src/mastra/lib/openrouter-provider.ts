// Wrapper to use OpenRouter with OpenAI provider
// This avoids the AI SDK version mismatch issue

export function createOpenRouterModel(modelName: string) {
  // Return a configuration object that Mastra can use
  return {
    provider: 'openai',
    modelId: modelName,
    config: {
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/mastra-ai/mastra',
        'X-Title': 'Mastra Toolbox',
      },
    },
  };
}