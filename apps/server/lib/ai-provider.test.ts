import { describe, expect, it } from 'vitest'

import {
  AIProviderConfigurationError,
  getMealAnalysisModelConfiguration,
  isMealAnalysisAiConfigured,
  transformMealAnalysisRequestBody
} from './ai-provider'

describe('AI provider configuration', () => {
  it('disables thinking without mutating the structured request body', () => {
    const body = { model: 'test-model', messages: [], enable_thinking: true }

    expect(transformMealAnalysisRequestBody(body)).toEqual({
      model: 'test-model',
      messages: [],
      enable_thinking: false
    })
    expect(body.enable_thinking).toBe(true)
  })

  it('reports configuration without exposing its values', () => {
    expect(
      isMealAnalysisAiConfigured({
        AI_BASE_URL: 'https://example.test/v1',
        AI_API_KEY: 'secret-key',
        AI_MODEL: 'test-model'
      })
    ).toBe(true)
    expect(isMealAnalysisAiConfigured({ AI_API_KEY: 'secret-key' })).toBe(false)
  })

  it('returns the configured model id and rejects incomplete settings safely', () => {
    const configured = getMealAnalysisModelConfiguration({
      AI_BASE_URL: 'https://example.test/v1',
      AI_API_KEY: 'secret-key',
      AI_MODEL: 'test-model'
    })

    expect(configured.modelVersion).toBe('test-model')
    expect(() =>
      getMealAnalysisModelConfiguration({
        AI_BASE_URL: 'https://example.test/v1',
        AI_API_KEY: 'secret-key'
      })
    ).toThrow(AIProviderConfigurationError)

    try {
      getMealAnalysisModelConfiguration({
        AI_BASE_URL: 'https://private.example.test/v1',
        AI_API_KEY: 'do-not-leak'
      })
    } catch (error) {
      expect(String(error)).not.toContain('do-not-leak')
      expect(String(error)).not.toContain('private.example.test')
    }
  })
})
