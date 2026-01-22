import { create } from 'zustand'
import type { Message, ChatSession } from '../types'
import { DEFAULT_MODEL_ID } from '../constants'

// Generate a unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Create a new empty session
const createNewSession = (): ChatSession => ({
    id: generateId(),
    title: 'New Chat',
    messages: [
        {
            id: 'welcome',
            role: 'model',
            text: "Hi there. I'm ready to help you with your code.",
            timestamp: Date.now()
        }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
})

// Pending edit for approval flow
export interface PendingEdit {
    id: string
    type: 'write' | 'edit'
    path: string
    originalContent: string
    newContent: string
    status: 'pending' | 'applied' | 'rejected'
}

interface ChatStore {
    // Session management
    sessions: ChatSession[]
    activeSessionId: string | null

    // Current session state (derived for convenience)
    isLoading: boolean
    selectedModelId: string
    pendingImages: string[]

    // Pending edits for approval
    pendingEdits: PendingEdit[]

    // Session Actions
    createSession: () => void
    switchSession: (id: string) => void
    deleteSession: (id: string) => void
    updateSessionTitle: (id: string, title: string) => void

    // Message Actions
    addMessage: (message: Message) => void
    updateMessage: (id: string, text: string) => void
    setMessageError: (id: string, isError: boolean) => void

    // State Actions
    setLoading: (loading: boolean) => void
    setModel: (modelId: string) => void
    clearMessages: () => void

    // Image Actions
    addPendingImage: (base64: string) => void
    removePendingImage: (index: number) => void
    clearPendingImages: () => void

    // Pending Edit Actions
    addPendingEdit: (edit: PendingEdit) => void
    updateEditStatus: (id: string, status: 'applied' | 'rejected') => void
    getPendingEdit: (id: string) => PendingEdit | undefined

    // Getters
    getActiveSession: () => ChatSession | undefined
    getConversationHistory: () => Array<{ role: 'user' | 'assistant', content: string }>
}

// Initialize with one session
const initialSession = createNewSession()

export const useChatStore = create<ChatStore>((set, get) => ({
    sessions: [initialSession],
    activeSessionId: initialSession.id,
    isLoading: false,
    selectedModelId: DEFAULT_MODEL_ID,
    pendingImages: [],
    pendingEdits: [],

    // Session Actions
    createSession: () => {
        const newSession = createNewSession()
        set((state) => ({
            sessions: [...state.sessions, newSession],
            activeSessionId: newSession.id
        }))
    },

    switchSession: (id) => {
        set({ activeSessionId: id })
    },

    deleteSession: (id) => {
        set((state) => {
            const newSessions = state.sessions.filter(s => s.id !== id)
            // If we deleted the active session, switch to another or create new
            let newActiveId = state.activeSessionId
            if (state.activeSessionId === id) {
                if (newSessions.length > 0) {
                    newActiveId = newSessions[newSessions.length - 1].id
                } else {
                    // No sessions left, create a new one
                    const fresh = createNewSession()
                    newSessions.push(fresh)
                    newActiveId = fresh.id
                }
            }
            return { sessions: newSessions, activeSessionId: newActiveId }
        })
    },

    updateSessionTitle: (id, title) => {
        set((state) => ({
            sessions: state.sessions.map(s =>
                s.id === id ? { ...s, title, updatedAt: Date.now() } : s
            )
        }))
    },

    // Message Actions - now operate on active session
    addMessage: (message) => {
        set((state) => ({
            sessions: state.sessions.map(session =>
                session.id === state.activeSessionId
                    ? {
                        ...session,
                        messages: [...session.messages, message],
                        updatedAt: Date.now(),
                        // Auto-title from first user message
                        title: session.title === 'New Chat' && message.role === 'user'
                            ? message.text.slice(0, 30) + (message.text.length > 30 ? '...' : '')
                            : session.title
                    }
                    : session
            )
        }))
    },

    updateMessage: (id, text) => {
        set((state) => ({
            sessions: state.sessions.map(session =>
                session.id === state.activeSessionId
                    ? {
                        ...session,
                        messages: session.messages.map(msg =>
                            msg.id === id ? { ...msg, text } : msg
                        ),
                        updatedAt: Date.now()
                    }
                    : session
            )
        }))
    },

    setMessageError: (id, isError) => {
        set((state) => ({
            sessions: state.sessions.map(session =>
                session.id === state.activeSessionId
                    ? {
                        ...session,
                        messages: session.messages.map(msg =>
                            msg.id === id ? { ...msg, isError } : msg
                        )
                    }
                    : session
            )
        }))
    },

    setLoading: (loading) => set({ isLoading: loading }),

    setModel: (modelId) => set({ selectedModelId: modelId }),

    clearMessages: () => {
        set((state) => ({
            sessions: state.sessions.map(session =>
                session.id === state.activeSessionId
                    ? {
                        ...session,
                        messages: [
                            {
                                id: 'welcome',
                                role: 'model',
                                text: "Hi there. I'm ready to help you with your code.",
                                timestamp: Date.now()
                            }
                        ],
                        title: 'New Chat',
                        updatedAt: Date.now()
                    }
                    : session
            )
        }))
    },

    addPendingImage: (base64) =>
        set((state) => ({
            pendingImages: [...state.pendingImages, base64]
        })),

    removePendingImage: (index) =>
        set((state) => ({
            pendingImages: state.pendingImages.filter((_, i) => i !== index)
        })),

    clearPendingImages: () => set({ pendingImages: [] }),

    // Pending Edit Actions
    addPendingEdit: (edit) =>
        set((state) => ({
            pendingEdits: [...state.pendingEdits, edit]
        })),

    updateEditStatus: (id, status) =>
        set((state) => ({
            pendingEdits: state.pendingEdits.map(e =>
                e.id === id ? { ...e, status } : e
            )
        })),

    getPendingEdit: (id) => {
        return get().pendingEdits.find(e => e.id === id)
    },

    // Getters
    getActiveSession: () => {
        const state = get()
        return state.sessions.find(s => s.id === state.activeSessionId)
    },

    getConversationHistory: () => {
        const session = get().getActiveSession()
        if (!session) return []

        // Convert messages to Anthropic API format
        // Skip the welcome message, and map 'model' -> 'assistant'
        return session.messages
            .filter(m => m.id !== 'welcome' && m.text.trim())
            .map(m => ({
                role: m.role === 'model' ? 'assistant' as const : 'user' as const,
                content: m.text
            }))
    }
}))
