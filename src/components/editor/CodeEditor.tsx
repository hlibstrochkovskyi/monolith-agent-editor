import React, { useRef, useEffect } from 'react'
import Editor, { OnMount, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { Loader2 } from 'lucide-react'
import { getLanguageFromPath } from '../../lib/languageUtils'
import { useWorkspaceStore } from '../../stores/workspaceStore'

// Configure loader to use local monaco instance (no CDN)
loader.config({ monaco })

interface CodeEditorProps {
    value: string | null
    filePath: string | null
    isLoading?: boolean
    onChange?: (value: string | undefined) => void
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
    value,
    filePath,
    isLoading = false,
    onChange
}) => {
    const language = getLanguageFromPath(filePath)
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const setCursorPosition = useWorkspaceStore(state => state.setCursorPosition)

    // Simplified layout handling using built-in automaticLayout
    const handleEditorDidMount: OnMount = (editor) => {
        editorRef.current = editor

        // Subscribe to cursor position changes
        editor.onDidChangeCursorPosition((e) => {
            setCursorPosition(e.position.lineNumber, e.position.column)
        })

        // Set initial position
        const pos = editor.getPosition()
        if (pos) {
            setCursorPosition(pos.lineNumber, pos.column)
        }
    }

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div ref={containerRef} className="h-full w-full overflow-hidden min-w-0">
            <Editor
                height="100%"
                language={language}
                value={value ?? ''}
                theme="vs-light"
                onChange={onChange}
                onMount={handleEditorDidMount}
                options={{
                    // Performance
                    automaticLayout: true, // Internal robust layout handling

                    // Visuals & Feel
                    minimap: { enabled: true, renderCharacters: false },
                    lineNumbers: 'on',
                    cursorBlinking: 'blink', // Standard blinking
                    cursorSmoothCaretAnimation: 'off', // No smooth motion
                    smoothScrolling: true,

                    // Typography
                    fontSize: 14, // Slightly larger for readability
                    lineHeight: 22,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                    fontLigatures: true,

                    // Formatting
                    tabSize: 4,
                    insertSpaces: true,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    renderWhitespace: 'boundary', // Cleaner than 'selection'
                    bracketPairColorization: { enabled: true },

                    // Layout
                    padding: { top: 16, bottom: 16 },
                    renderLineHighlight: 'all',
                    roundedSelection: false,
                    overviewRulerBorder: false,
                    hideCursorInOverviewRuler: true,
                }}
                loading={
                    <div className="h-full w-full flex items-center justify-center bg-background">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                }
            />
        </div>
    )
}
