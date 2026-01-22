export type Role = 'user' | 'model'

export interface Message {
    id: string
    role: Role
    text: string
    timestamp: number
    isError?: boolean
    images?: string[] // Base64 data URIs
}

export interface ModelOption {
    id: string
    name: string
    provider: 'Google' | 'OpenAI' | 'Anthropic'
    apiModel: string
    isUnavailable?: boolean
}

export interface ChatState {
    messages: Message[]
    isLoading: boolean
    selectedModelId: string
}

export interface ChatSession {
    id: string
    title: string
    messages: Message[]
    createdAt: number
    updatedAt: number
}
