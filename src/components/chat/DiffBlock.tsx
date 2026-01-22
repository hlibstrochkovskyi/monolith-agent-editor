import React from 'react'
import { Check, X, FileCode } from 'lucide-react'
import { Button } from '../ui/button'

interface DiffBlockProps {
    editId: string
    filePath: string
    fullPath: string
    originalContent: string
    newContent: string
    onAccept: (editId: string, fullPath: string, newContent: string) => void
    onReject: (editId: string) => void
    isApplied?: boolean
    isRejected?: boolean
}

export const DiffBlock: React.FC<DiffBlockProps> = ({
    editId,
    filePath,
    fullPath,
    originalContent,
    newContent,
    onAccept,
    onReject,
    isApplied = false,
    isRejected = false
}) => {
    // Generate simple line-based diff
    const originalLines = originalContent.split('\n')
    const newLines = newContent.split('\n')

    // Simple diff algorithm - find common prefix/suffix and show changes
    const diffLines = generateDiff(originalLines, newLines)

    const fileName = filePath.split(/[\\/]/).pop() || filePath

    if (isApplied) {
        return (
            <div className="my-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                    <Check size={16} />
                    <span>Applied changes to {fileName}</span>
                </div>
            </div>
        )
    }

    if (isRejected) {
        return (
            <div className="my-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                    <X size={16} />
                    <span>Rejected changes to {fileName}</span>
                </div>
            </div>
        )
    }

    return (
        <div className="my-3 border border-border rounded-lg overflow-hidden bg-card shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <FileCode size={14} className="text-blue-500" />
                    <span>Proposed Edit: {fileName}</span>
                </div>
                <span className="text-xs text-muted-foreground">{filePath}</span>
            </div>

            {/* Diff Content */}
            <div className="max-h-[300px] overflow-auto">
                <pre className="text-xs font-mono p-0 m-0">
                    {diffLines.map((line, index) => (
                        <div
                            key={index}
                            className={`px-3 py-0.5 ${line.type === 'add'
                                ? 'bg-green-100 text-green-800'
                                : line.type === 'remove'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-transparent text-foreground'
                                }`}
                        >
                            <span className="inline-block w-4 text-muted-foreground select-none">
                                {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                            </span>
                            {line.content}
                        </div>
                    ))}
                </pre>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-t border-border">
                <Button
                    size="sm"
                    onClick={() => onAccept(editId, fullPath, newContent)}
                    className="h-7 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                >
                    <Check size={14} />
                    Accept
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReject(editId)}
                    className="h-7 gap-1.5"
                >
                    <X size={14} />
                    Reject
                </Button>
            </div>
        </div>
    )
}

// Simple diff generation
interface DiffLine {
    type: 'add' | 'remove' | 'context'
    content: string
}

function generateDiff(oldLines: string[], newLines: string[]): DiffLine[] {
    const result: DiffLine[] = []

    // Find longest common subsequence or use simple comparison
    // For MVP, we'll use a simple approach: show removed then added

    // Find common prefix
    let prefixLen = 0
    while (prefixLen < oldLines.length && prefixLen < newLines.length &&
        oldLines[prefixLen] === newLines[prefixLen]) {
        prefixLen++
    }

    // Find common suffix
    let suffixLen = 0
    while (suffixLen < oldLines.length - prefixLen &&
        suffixLen < newLines.length - prefixLen &&
        oldLines[oldLines.length - 1 - suffixLen] === newLines[newLines.length - 1 - suffixLen]) {
        suffixLen++
    }

    // Add context (first 3 lines of prefix)
    const contextStart = Math.max(0, prefixLen - 3)
    for (let i = contextStart; i < prefixLen; i++) {
        result.push({ type: 'context', content: oldLines[i] })
    }

    // Add removed lines
    for (let i = prefixLen; i < oldLines.length - suffixLen; i++) {
        result.push({ type: 'remove', content: oldLines[i] })
    }

    // Add new lines
    for (let i = prefixLen; i < newLines.length - suffixLen; i++) {
        result.push({ type: 'add', content: newLines[i] })
    }

    // Add context (last 3 lines of suffix)
    const contextEnd = Math.min(suffixLen, 3)
    for (let i = 0; i < contextEnd; i++) {
        const idx = oldLines.length - suffixLen + i
        result.push({ type: 'context', content: oldLines[idx] })
    }

    // If no changes, show a sample
    if (result.length === 0) {
        for (let i = 0; i < Math.min(5, newLines.length); i++) {
            result.push({ type: 'context', content: newLines[i] })
        }
    }

    return result
}
