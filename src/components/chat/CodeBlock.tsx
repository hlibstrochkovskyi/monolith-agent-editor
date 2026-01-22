import React, { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeBlockProps {
    language: string
    value: string
}

export const CodeBlock: React.FC<CodeBlockProps> = React.memo(({ language, value }) => {
    const [isCopied, setIsCopied] = useState(false)

    const copyToClipboard = async () => {
        if (!navigator.clipboard) return
        try {
            await navigator.clipboard.writeText(value)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        } catch (error) {
            console.error('Failed to copy text: ', error)
        }
    }

    // Default to 'text' if no language provided
    const lang = language || 'text'

    return (
        <div className="rounded-lg border border-border overflow-hidden my-4 bg-background">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                    {lang}
                </span>
                <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy code"
                >
                    {isCopied ? (
                        <>
                            <Check size={14} className="text-green-500" />
                            <span>Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy size={14} />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>

            {/* Code Content */}
            <div className="text-sm font-mono overflow-x-auto">
                <SyntaxHighlighter
                    language={lang}
                    style={oneLight}
                    customStyle={{
                        margin: 0,
                        padding: '1rem',
                        background: 'transparent',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                    }}
                    wrapLines={true}
                    wrapLongLines={true}
                    PreTag="div"
                >
                    {value}
                </SyntaxHighlighter>
            </div>
        </div>
    )
})
