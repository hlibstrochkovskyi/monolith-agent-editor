import { useWorkspaceStore } from '../stores/workspaceStore'
import { getLanguageFromPath } from '../lib/languageUtils'

/**
 * Workspace context for AI injection
 */
export interface WorkspaceContext {
    // Workspace metadata
    projectName: string
    projectPath: string
    fileTree: string

    // Active editor context
    activeFile: {
        path: string
        content: string
        language: string
        cursorLine: number
        cursorColumn: number
    } | null

    // Open files
    openFilePaths: string[]
}

/**
 * Build a simplified file tree string from the workspace store
 */
function buildFileTreeString(tree: any[], indent: number = 0): string {
    const lines: string[] = []
    const prefix = '  '.repeat(indent)

    for (const node of tree) {
        if (node.isFolder) {
            lines.push(`${prefix}📁 ${node.name}/`)
            if (node.children && node.children.length > 0) {
                lines.push(buildFileTreeString(node.children, indent + 1))
            }
        } else {
            lines.push(`${prefix}📄 ${node.name}`)
        }
    }

    return lines.join('\n')
}

/**
 * Gather the current workspace context for AI injection
 */
export function buildWorkspaceContext(): WorkspaceContext {
    const state = useWorkspaceStore.getState()

    const {
        rootPath,
        rootName,
        tree,
        activeFileId,
        fileContents,
        openFiles,
        cursorPosition
    } = state

    // Build file tree representation
    const fileTree = tree.length > 0
        ? buildFileTreeString(tree)
        : '(No files)'

    // Build active file context
    let activeFile: WorkspaceContext['activeFile'] = null
    if (activeFileId && fileContents[activeFileId]) {
        activeFile = {
            path: activeFileId,
            content: fileContents[activeFileId],
            language: getLanguageFromPath(activeFileId) || 'plaintext',
            cursorLine: cursorPosition.line,
            cursorColumn: cursorPosition.column
        }
    }

    return {
        projectName: rootName || 'Untitled Project',
        projectPath: rootPath || '',
        fileTree,
        activeFile,
        openFilePaths: openFiles
    }
}

/**
 * Build the system prompt with workspace context
 */
export function buildSystemPrompt(context: WorkspaceContext): string {
    const parts: string[] = []

    // Header
    parts.push(`You are an AI coding assistant integrated into Work Studio IDE.`)
    parts.push(`You have full context of the user's current workspace and can help with coding tasks.`)
    parts.push('')

    // Project info
    parts.push(`## Current Project`)
    parts.push(`- **Name**: ${context.projectName}`)
    if (context.projectPath) {
        parts.push(`- **Path**: ${context.projectPath}`)
    }
    parts.push('')

    // File tree
    parts.push(`## Project Structure`)
    parts.push('```')
    parts.push(context.fileTree)
    parts.push('```')
    parts.push('')

    // Active file
    if (context.activeFile) {
        parts.push(`## Currently Open File`)
        parts.push(`- **Path**: ${context.activeFile.path}`)
        parts.push(`- **Language**: ${context.activeFile.language}`)
        parts.push(`- **Cursor Position**: Line ${context.activeFile.cursorLine}, Column ${context.activeFile.cursorColumn}`)
        parts.push('')
        parts.push(`### File Content (with line numbers)`)

        // Add line numbers to content for accurate references
        const lines = context.activeFile.content.split('\n')
        const numberedLines = lines.map((line, index) => `${String(index + 1).padStart(4, ' ')} | ${line}`)

        parts.push('```' + context.activeFile.language)
        parts.push(numberedLines.join('\n'))
        parts.push('```')
        parts.push('')
    }

    // Other open files
    if (context.openFilePaths.length > 0) {
        const otherFiles = context.openFilePaths.filter(p => p !== context.activeFile?.path)
        if (otherFiles.length > 0) {
            parts.push(`## Other Open Tabs`)
            otherFiles.forEach(path => {
                const fileName = path.split(/[\\/]/).pop()
                parts.push(`- ${fileName}`)
            })
            parts.push('')
        }
    }

    // Instructions
    parts.push(`## Your Role`)
    parts.push(`- Help the user understand, modify, debug, or extend their code.`)
    parts.push(`- You can see the currently open file and project structure.`)
    parts.push(`- Provide specific, actionable suggestions with code examples.`)
    parts.push(`- Reference line numbers when discussing the open file.`)

    return parts.join('\n')
}

/**
 * Get the full context-aware system prompt
 */
export function getAISystemPrompt(): string {
    const context = buildWorkspaceContext()
    return buildSystemPrompt(context)
}
