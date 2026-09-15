import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

export function getMealAnalysisModel() {
  const baseURL = process.env.AI_BASE_URL
  const apiKey = process.env.AI_API_KEY
  const modelId = process.env.AI_MODEL

  if (!baseURL || !apiKey || !modelId) {
    throw new Error('AI provider is not configured. Set AI_BASE_URL, AI_API_KEY, and AI_MODEL.')
  }

  const provider = createOpenAICompatible({
    name: 'food-sense-ai',
    baseURL,
    apiKey
  })

  return provider(modelId)
}
