import React, { useState } from 'react'
import { FileText, Zap, FolderOpen, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface ToolStatusBlockProps {
    toolName: string
    path: string
    status: 'running' | 'success' | 'error'
    message?: string
}

export const ToolStatusBlock: React.FC<ToolStatusBlockProps> = ({ toolName, path, status, message }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const fileName = path.split(/[\\/]/).pop() || path

    // Determine icon and label based on tool
    let Icon = FileText
    let label = 'Reading File'

    if (toolName === 'edit_file' || toolName === 'write_file') {
        Icon = Zap
        label = toolName === 'write_file' ? 'Creating File' : 'Editing File'
    } else if (toolName === 'list_directory') {
        Icon = FolderOpen
        label = 'Scanning Directory'
    }

    // Status colors
    const statusColor = status === 'running'
        ? 'text-blue-500'
        : status === 'success'
            ? 'text-green-500'
            : 'text-red-500'

    const borderColor = status === 'running'
        ? 'border-blue-200 bg-blue-50/50'
        : status === 'success'
            ? 'border-green-200 bg-green-50/50'
            : 'border-red-200 bg-red-50/50'

    return (
        <div className={`my-2 rounded-md border ${borderColor} overflow-hidden font-sans text-sm transition-all duration-200`}>
            <div
                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-black/5"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Status Icon */}
                <div className={`${statusColor} flex items-center justify-center`}>
                    {status === 'running' ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : status === 'success' ? (
                        <CheckCircle2 size={16} />
                    ) : (
                        <AlertCircle size={16} />
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 flex items-center gap-2 overflow-hidden">
                    <span className="font-semibold text-foreground/80 whitespace-nowrap">{label}</span>
                    <span className="text-muted-foreground text-xs truncate font-mono bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
                        {fileName}
                    </span>
                </div>

                {/* Expand Toggle */}
                <div className="text-muted-foreground">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-3 py-2 bg-background/50 border-t border-border/20 text-xs space-y-1">
                    <div className="flex gap-2">
                        <span className="text-muted-foreground w-12 shrink-0">Path:</span>
                        <span className="font-mono text-foreground/80 break-all">{path}</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-muted-foreground w-12 shrink-0">Tool:</span>
                        <span className="font-mono text-foreground/80">{toolName}</span>
                    </div>
                    {message && (
                        <div className="flex gap-2 mt-1 pt-1 border-t border-border/10">
                            <span className="text-muted-foreground w-12 shrink-0">Result:</span>
                            <span className="text-foreground/80 whitespace-pre-wrap">{message}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
