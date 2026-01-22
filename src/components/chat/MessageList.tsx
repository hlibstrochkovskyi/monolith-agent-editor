import React, { useRef, useEffect, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Sparkles, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Message } from '../../types'
import { CodeBlock } from './CodeBlock'
import { DiffBlock } from './DiffBlock'
import { useChatStore, type PendingEdit } from '../../stores/chatStore'

interface MessageListProps {
    messages: Message[]
    isLoading: boolean
}

import { ToolStatusBlock } from './ToolStatusBlock'

// Parse markers from message text (DiffBlocks and ToolStatus)
function parseMessageContent(text: string): { cleanText: string; edits: any[]; toolStatuses: any[] } {
    let cleanText = text
    const edits: any[] = []
    const toolStatusesMap = new Map<string, any>()

    // 1. Extract DiffBlocks
    const editRegex = /\[DIFF_BLOCK\]([\s\S]*?)\[\/DIFF_BLOCK\]/g
    let match
    while ((match = editRegex.exec(text)) !== null) {
        try {
            const editData = JSON.parse(match[1])
            edits.push(editData)
            cleanText = cleanText.replace(match[0], '')
        } catch (e) {
            console.error('Failed to parse proposed edit:', e)
        }
    }

    // 2. Extract ToolStatus
    const toolRegex = /\[TOOL_STATUS\]([\s\S]*?)\[\/TOOL_STATUS\]/g
    while ((match = toolRegex.exec(text)) !== null) {
        try {
            const statusData = JSON.parse(match[1])
            toolStatusesMap.set(statusData.id, statusData)
            cleanText = cleanText.replace(match[0], '')
        } catch (e) {
            console.error('Failed to parse tool status:', e)
        }
    }

    // Sort tool statuses by ID (approximate order)
    const toolStatuses = Array.from(toolStatusesMap.values()).sort((a, b) =>
        a.id.localeCompare(b.id)
    )

    return {
        cleanText: cleanText.trim(),
        edits,
        toolStatuses
    }
}


export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
    const parentRef = useRef<HTMLDivElement>(null)
    const { addPendingEdit, updateEditStatus, getPendingEdit } = useChatStore()

    const virtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 80,
        overscan: 5
    })

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0) {
            virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' })
        }
    }, [messages.length, virtualizer])

    const handleAcceptEdit = useCallback(async (editId: string, path: string, newContent: string) => {
        console.log('[handleAcceptEdit] editId:', editId, 'path:', path)

        try {
            const success = await window.electronAPI?.applyEdit(path, newContent)
            console.log('[handleAcceptEdit] applyEdit result:', success)
            if (success) {
                updateEditStatus(editId, 'applied')
            }
        } catch (error) {
            console.error('Failed to apply edit:', error)
        }
    }, [updateEditStatus])

    const handleRejectEdit = useCallback((editId: string) => {
        updateEditStatus(editId, 'rejected')
    }, [updateEditStatus])

    return (
        <div
            ref={parentRef}
            className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth"
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative'
                }}
            >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                    const msg = messages[virtualRow.index]
                    return (
                        <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`
                            }}
                        >
                            <MessageItem
                                message={msg}
                                onAcceptEdit={handleAcceptEdit}
                                onRejectEdit={handleRejectEdit}
                                addPendingEdit={addPendingEdit}
                                getPendingEdit={getPendingEdit}
                            />
                        </div>
                    )
                })}
            </div>

            {/* Loading indicator */}
            {isLoading && messages[messages.length - 1]?.role !== 'model' && (
                <div className="flex gap-3 mt-4">
                    <div className="w-6 h-6 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                        <Sparkles size={14} className="text-orange-400" />
                    </div>
                    <div className="flex items-center mt-1">
                        <Loader2 size={16} className="animate-spin text-gray-400" />
                    </div>
                </div>
            )}
        </div>
    )
}

interface MessageItemProps {
    message: Message
    onAcceptEdit: (editId: string, path: string, newContent: string) => void
    onRejectEdit: (editId: string) => void
    addPendingEdit: (edit: PendingEdit) => void
    getPendingEdit: (id: string) => PendingEdit | undefined
}

import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

const markdownComponents: any = {
    code({ node, inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || '')
        return !inline && match ? (
            <CodeBlock
                language={match[1]}
                value={String(children).replace(/\n+$/, '')}
            />
        ) : (
            <code className={`${className} bg-muted px-1.5 py-0.5 rounded-md text-pink-500 font-mono text-[0.9em] border border-border/50`} {...props}>
                {children}
            </code>
        )
    },
    table({ children }: any) {
        return (
            <div className="my-4 w-full overflow-y-auto rounded-lg border border-border shadow-sm">
                <table className="w-full text-sm">{children}</table>
            </div>
        )
    },
    thead({ children }: any) {
        return <thead className="bg-muted/50 border-b border-border text-left">{children}</thead>
    },
    th({ children }: any) {
        return <th className="px-4 py-2 font-medium text-muted-foreground">{children}</th>
    },
    td({ children }: any) {
        return <td className="px-4 py-2 border-t border-border/50 first:border-t-0">{children}</td>
    },
    blockquote({ children }: any) {
        return (
            <blockquote className="my-4 border-l-4 border-primary/30 bg-primary/5 pl-4 py-2 italic rounded-r-lg text-muted-foreground shadow-sm">
                {children}
            </blockquote>
        )
    },
    p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
    h1: ({ children }: any) => <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>,
    ul: ({ children }: any) => <ul className="list-disc list-outside ml-5 my-3 space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal list-outside ml-5 my-3 space-y-1">{children}</ol>,
    li: ({ children }: any) => <li className="pl-1 text-sm">{children}</li>,
    hr: () => <hr className="my-6 border-border" />,
    a: ({ href, children }: any) => <a href={href} className="text-primary hover:underline underline-offset-4" target="_blank" rel="noopener noreferrer">{children}</a>
}

const MessageItem: React.FC<MessageItemProps> = React.memo(({ message, onAcceptEdit, onRejectEdit, addPendingEdit, getPendingEdit }) => {
    const isUser = message.role === 'user'

    // Parse proposed edits from message
    // Parse content markers (edits, tool status)
    const { cleanText, edits, toolStatuses } = parseMessageContent(message.text)

    // Add pending edits to store (only once per edit)
    useEffect(() => {
        edits.forEach(edit => {
            if (edit.__proposed_edit__ && !getPendingEdit(edit.id)) {
                addPendingEdit({
                    id: edit.id,
                    type: edit.type,
                    path: edit.path,
                    originalContent: edit.originalContent,
                    newContent: edit.newContent,
                    status: 'pending'
                })
            }
        })
    }, [edits, addPendingEdit, getPendingEdit])

    return (
        <div className={`flex gap-3 mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
                <div className="w-6 h-6 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={14} className="text-orange-400" />
                </div>
            )}

            <div className={`flex flex-col ${isUser ? 'max-w-[85%] items-end' : 'w-full max-w-[85%] items-start'}`}>
                <div
                    className={`text-sm leading-relaxed ${isUser
                        ? 'bg-gray-100 text-gray-800 px-3 py-2 rounded-2xl rounded-tr-sm'
                        : 'text-gray-800 w-full'
                        } ${message.isError ? 'text-red-500' : ''}`}
                >
                    {/* Render Images if present */}
                    {message.images && message.images.length > 0 && (
                        <div className={`flex flex-wrap gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                            {message.images.map((img, idx) => (
                                <div key={idx} className="relative rounded-md overflow-hidden border border-border/50">
                                    <img
                                        src={img}
                                        alt="attachment"
                                        className="h-20 w-auto object-cover max-w-[200px]"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {isUser ? (
                        message.text
                    ) : (
                        <>
                            {/* Render Tool Status Blocks first */}
                            {toolStatuses.map((status: any) => (
                                <ToolStatusBlock
                                    key={status.id}
                                    toolName={status.toolName}
                                    path={status.path}
                                    status={status.status}
                                    message={status.message}
                                />
                            ))}

                            {/* Render DiffBlocks for proposed edits */}
                            {edits.map((edit: any) => {
                                const pendingEdit = getPendingEdit(edit.id)
                                return (
                                    <DiffBlock
                                        key={edit.id}
                                        editId={edit.id}
                                        filePath={edit.relativePath || edit.path}
                                        fullPath={edit.path}
                                        originalContent={edit.originalContent}
                                        newContent={edit.newContent}
                                        onAccept={onAcceptEdit}
                                        onReject={onRejectEdit}
                                        isApplied={pendingEdit?.status === 'applied'}
                                        isRejected={pendingEdit?.status === 'rejected'}
                                    />
                                )
                            })}

                            {/* Render remaining text */}
                            {cleanText && (
                                <div className="max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={markdownComponents}
                                    >
                                        {cleanText}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
})
