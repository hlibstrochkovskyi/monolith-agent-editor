import React from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { getLanguageFromPath } from '../../lib/languageUtils'

export const StatusBar: React.FC = () => {
    const { cursorPosition, activeFileId } = useWorkspaceStore()

    // Derive language from active file
    const language = activeFileId ? getLanguageFromPath(activeFileId) : null
    const displayLanguage = language
        ? language.charAt(0).toUpperCase() + language.slice(1)
        : 'Plain Text'

    // Format cursor position
    const lineCol = `Ln ${cursorPosition.line}, Col ${cursorPosition.column}`

    return (
        <div className="h-6 bg-background border-t border-border flex items-center justify-between px-3 text-xs text-muted-foreground select-none flex-shrink-0">
            {/* Left side - can add more items later */}
            <div className="flex items-center gap-4">
                {/* Placeholder for future items like git branch */}
            </div>

            {/* Right side - Status items */}
            <div className="flex items-center gap-3">
                {/* Cursor Position */}
                <button className="hover:text-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors">
                    {lineCol}
                </button>

                {/* Encoding */}
                <button className="hover:text-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors">
                    UTF-8
                </button>

                {/* Language Mode */}
                <button className="hover:text-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors">
                    {displayLanguage}
                </button>
            </div>
        </div>
    )
}
