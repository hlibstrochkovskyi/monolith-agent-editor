import type { ModelOption } from './types'

export const AVAILABLE_MODELS: ModelOption[] = [
    { id: 'claude-sonnet-4.5', name: 'Claude 4.5 Sonnet', provider: 'Anthropic', apiModel: 'claude-sonnet-4-5' },
    { id: 'claude-opus-4.5', name: 'Claude 4.5 Opus', provider: 'Anthropic', apiModel: 'claude-opus-4-5' },
    { id: 'claude-haiku-4.5', name: 'Claude 4.5 Haiku', provider: 'Anthropic', apiModel: 'claude-haiku-4-5' },
    { id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'Google', apiModel: 'gemini-1.5-pro', isUnavailable: true },
    { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'Google', apiModel: 'gemini-1.5-flash', isUnavailable: true },
    { id: 'gpt-5.2', name: 'GPT 5.2', provider: 'OpenAI', apiModel: 'gpt-4o', isUnavailable: true }
]

export const DEFAULT_MODEL_ID = 'claude-sonnet-4.5'

export const APP_NAME = 'Work Studio'
export const APP_VERSION = '1.0.0'
