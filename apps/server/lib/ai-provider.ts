import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'

type AIEnvironment = Record<string, string | undefined>

export interface MealAnalysisModelConfiguration {
  model: LanguageModel
  modelVersion: string
}

export class AIProviderConfigurationError extends Error {
  constructor() {
    super('AI provider is not configured')
    this.name = 'AIProviderConfigurationError'
  }
}

export function isMealAnalysisAiConfigured(
  environment: AIEnvironment = process.env
): boolean {
  return Boolean(
    environment.AI_BASE_URL?.trim() &&
      environment.AI_API_KEY?.trim() &&
      environment.AI_MODEL?.trim()
  )
}

export function getMealAnalysisModelConfiguration(
  environment: AIEnvironment = process.env
): MealAnalysisModelConfiguration {
  const baseURL = environment.AI_BASE_URL?.trim()
  const apiKey = environment.AI_API_KEY?.trim()
  const modelId = environment.AI_MODEL?.trim()

  if (!baseURL || !apiKey || !modelId) {
    throw new AIProviderConfigurationError()
  }

  const provider = createOpenAICompatible({
    name: 'food-sense-ai',
    baseURL,
    apiKey
  })

  return {
    model: provider(modelId),
    modelVersion: modelId
  }
}

export function getMealAnalysisModel(): LanguageModel {
  return getMealAnalysisModelConfiguration().model
}
