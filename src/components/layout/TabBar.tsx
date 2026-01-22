import React from 'react'
import { X, Circle, Play } from 'lucide-react'
import { cn } from '../../lib/utils'
import { FileIcon } from 'lucide-react' // Fallback icon
import { useWorkspaceStore } from '../../stores/workspaceStore'

interface TabBarProps {
    openFiles: string[]
    activeFileId: string | null
    unsavedFiles: Set<string>
    onSelect: (path: string) => void
    onClose: (path: string) => void
}

export const TabBar: React.FC<TabBarProps> = ({
    openFiles,
    activeFileId,
    unsavedFiles,
    onSelect,
    onClose
}) => {
    // If no files open, show nothing (or empty state logic in parent)
    if (openFiles.length === 0) return null

    const handleRun = (e: React.MouseEvent) => {
        e.stopPropagation()
        useWorkspaceStore.getState().runActiveFile()
    }

    return (
        <div className="flex-shrink-0 flex items-center justify-between bg-muted/20 border-b border-border overflow-hidden h-9">
            <div className="flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 flex-1">
                {openFiles.map(path => {
                    const fileName = path.split(/[\\/]/).pop() || 'untitled'
                    const isActive = path === activeFileId
                    const isDirty = unsavedFiles.has(path)

                    return (
                        <div
                            key={path}
                            onClick={() => onSelect(path)}
                            className={cn(
                                "group flex items-center h-9 px-3 min-w-[120px] max-w-[200px] border-r border-border/50 cursor-pointer select-none transition-colors",
                                isActive ? "bg-background text-foreground border-t-2 border-t-primary" : "bg-transparent text-muted-foreground hover:bg-muted/50 border-t-2 border-t-transparent"
                            )}
                            title={path}
                        >
                            {/* Icon based on extension could go here */}
                            <FileIcon className="w-3.5 h-3.5 mr-2 opacity-70 flex-shrink-0" />

                            <span className="text-xs truncate flex-1">{fileName}</span>

                            <div className="ml-2 flex flex-shrink-0 items-center justify-center w-5 h-5">
                                {isDirty ? (
                                    <Circle className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                ) : (
                                    <div
                                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-muted-foreground/20 transition-all"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onClose(path)
                                        }}
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Run Button in Tab Bar */}
            <div className="flex items-center px-2 border-l border-border/50 bg-background h-full">
                <button
                    onClick={handleRun}
                    className="p-1.5 rounded text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    title="Run Active File"
                >
                    <Play size={14} fill="currentColor" />
                </button>
            </div>
        </div>
    )
}
