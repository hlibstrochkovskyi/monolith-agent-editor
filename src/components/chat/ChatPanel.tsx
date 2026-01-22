import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, Terminal, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { ModelSelector } from './ModelSelector'
import { MessageList } from './MessageList'
import { ImagePreview } from './ImagePreview'
import { useChatStore } from '../../stores/chatStore'
import { AVAILABLE_MODELS } from '../../constants'
import { getAISystemPrompt } from '../../services/contextService'
import type { Message } from '../../types'

export const ChatPanel: React.FC = () => {
    const {
        isLoading,
        selectedModelId,
        pendingImages,
        addMessage,
        updateMessage,
        setLoading,
        setModel,
        setMessageError,
        addPendingImage,
        removePendingImage,
        clearPendingImages,
        createSession,
        getActiveSession,
        getConversationHistory
    } = useChatStore()

    // Get active session messages
    const activeSession = getActiveSession()
    const messages = activeSession?.messages || []

    const [inputValue, setInputValue] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
        }
    }, [inputValue])

    const handleSelectImage = async () => {
        if (pendingImages.length >= 5) return
        try {
            const base64Info = await window.electronAPI?.selectImage()
            if (base64Info) {
                addPendingImage(base64Info)
            }
        } catch (error) {
            console.error('Failed to select image:', error)
        }
    }

    const handleSendMessage = useCallback(async () => {
        if ((!inputValue.trim() && pendingImages.length === 0) || isLoading) return

        const currentImages = [...pendingImages]
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: inputValue.trim(),
            timestamp: Date.now(),
            images: currentImages.length > 0 ? currentImages : undefined
        }

        setInputValue('')
        clearPendingImages()
        if (textareaRef.current) textareaRef.current.style.height = 'auto'

        addMessage(userMsg)
        setLoading(true)

        // Placeholder for AI response
        const tempModelMsgId = (Date.now() + 1).toString()
        const modelOption = AVAILABLE_MODELS.find(m => m.id === selectedModelId)

        // Add empty model message to stream into
        addMessage({
            id: tempModelMsgId,
            role: 'model',
            text: '',
            timestamp: Date.now()
        })

        try {
            // Get conversation history for context
            const conversationHistory = getConversationHistory()

            // Build workspace context system prompt
            const systemPrompt = getAISystemPrompt()

            // Listen for streaming chunks
            const unsubscribe = window.electronAPI?.onAiChunk((text) => {
                updateMessage(tempModelMsgId, text)
            })

            // Send message via IPC with full conversation history and system prompt
            await window.electronAPI?.sendMessage(
                inputValue.trim(),
                currentImages,
                modelOption?.apiModel || 'claude-3-5-sonnet-20241022',
                conversationHistory,
                systemPrompt
            )

            unsubscribe?.()
        } catch (error: any) {
            console.error('Chat error:', error)
            setMessageError(tempModelMsgId, true)
            const errorMsg = error.message || 'Sorry, I encountered an error processing your request.'
            updateMessage(tempModelMsgId, `Error: ${errorMsg}`)
        } finally {
            setLoading(false)
        }
    }, [inputValue, pendingImages, isLoading, selectedModelId, addMessage, updateMessage, setLoading, setMessageError, clearPendingImages, getConversationHistory])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const handleNewChat = () => {
        createSession()
    }

    return (
        <div className="flex flex-col h-full bg-background border-l border-border shadow-sm w-full min-w-0 overflow-hidden">
            {/* Header */}
            <div className="h-9 border-b border-border flex items-center justify-between px-4 bg-background/50 backdrop-blur-sm flex-shrink-0">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Terminal size={14} />
                    <span>Assistant</span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewChat}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    title="New Chat"
                >
                    <Plus size={14} className="mr-1" />
                    New
                </Button>
            </div>

            {/* Messages Area */}
            <MessageList messages={messages} isLoading={isLoading} />

            {/* Input Area */}
            <div className="p-3 bg-background flex-shrink-0 min-w-0">
                <div className="border border-input rounded-xl shadow-sm bg-card transition-all duration-200">

                    {/* Image Previews */}
                    <ImagePreview images={pendingImages} onRemove={removePendingImage} />

                    <div className="px-3 pt-3">
                        <Textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe a task..."
                            className="min-h-[40px] w-full border-none shadow-none focus-visible:ring-0 resize-none font-mono text-sm px-0 py-0"
                            rows={1}
                        />
                    </div>

                    <div className="flex items-center justify-between px-2 pb-2 mt-2 gap-2 flex-wrap">
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Attachment Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Attach photo"
                                onClick={handleSelectImage}
                                disabled={pendingImages.length >= 5}
                            >
                                <span className="text-lg leading-none font-light block mb-0.5">+</span>
                            </Button>

                            <div className="h-4 w-[1px] bg-border mx-1" />

                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                                <Sparkles size={12} />
                                <span>Auto</span>
                                <ChevronDown size={10} className="ml-1 text-muted-foreground" />
                            </Button>

                            <ModelSelector
                                selectedModelId={selectedModelId}
                                onSelect={setModel}
                            />
                        </div>

                        <Button
                            size="icon"
                            onClick={handleSendMessage}
                            disabled={(!inputValue.trim() && pendingImages.length === 0) || isLoading}
                            className={`h-8 w-8 rounded-full shadow-sm transition-all ${inputValue.trim() || pendingImages.length > 0 ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground'
                                }`}
                        >
                            <Send size={16} strokeWidth={2} />
                        </Button>
                    </div>
                </div>
                <div className="text-[10px] text-center text-muted-foreground mt-2 font-mono">
                    Work Studio v1.0.0
                </div>
            </div>
        </div>
    )
}

// Helper for the Auto button
const ChevronDown: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m6 9 6 6 6-6" />
    </svg>
)
