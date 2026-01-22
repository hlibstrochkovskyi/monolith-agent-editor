import React, { useRef, useEffect, useState, useCallback } from 'react'
import { NodeRendererProps } from 'react-arborist'
import {
    Folder, FolderOpen, File, FileText, FileCode, FileJson, Image,
    ChevronRight, ChevronDown, FilePlus, FolderPlus, Pencil, Trash2,
    FileTerminal, FileCog, FileArchive, FileSpreadsheet, Database, FileBox
} from 'lucide-react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '../ui/context-menu'

interface NodeData {
    id: string
    name: string
    path: string
    isFolder: boolean
    isOpen?: boolean
    children?: NodeData[]
    _isNew?: boolean
}

// Get file icon based on extension and name
function getFileIcon(name: string) {
    const lowerName = name.toLowerCase()
    const ext = name.split('.').pop()?.toLowerCase()

    // Specific filenames
    if (lowerName === 'dockerfile') return <FileBox className="w-4 h-4 text-blue-600" />
    if (lowerName === 'package.json') return <FileJson className="w-4 h-4 text-red-500" />
    if (lowerName === 'tsconfig.json') return <FileCode className="w-4 h-4 text-blue-500" />
    if (lowerName === 'readme.md') return <FileText className="w-4 h-4 text-purple-500" />
    if (lowerName.startsWith('.env')) return <FileCog className="w-4 h-4 text-yellow-500" />
    if (lowerName === '.gitignore') return <FileCog className="w-4 h-4 text-gray-500" />

    switch (ext) {
        // Web
        case 'ts':
        case 'tsx':
            return <FileCode className="w-4 h-4 text-blue-500" />
        case 'js':
        case 'jsx':
        case 'cjs':
        case 'mjs':
            return <FileCode className="w-4 h-4 text-yellow-400" />
        case 'html':
        case 'htm':
            return <FileCode className="w-4 h-4 text-orange-500" />
        case 'css':
        case 'scss':
        case 'less':
        case 'sass':
            return <FileCode className="w-4 h-4 text-pink-500" />
        case 'json':
        case 'jsonc':
            return <FileJson className="w-4 h-4 text-yellow-500" />

        // Backend / Systems
        case 'java':
        case 'class':
        case 'jar':
            return <FileCode className="w-4 h-4 text-red-500" />
        case 'py':
        case 'pyc':
        case 'pyd':
        case 'venv':
            return <FileCode className="w-4 h-4 text-blue-400" />
        case 'c':
        case 'h':
            return <FileCode className="w-4 h-4 text-blue-600" />
        case 'cpp':
        case 'hpp':
        case 'cc':
            return <FileCode className="w-4 h-4 text-blue-700" />
        case 'cs':
            return <FileCode className="w-4 h-4 text-purple-600" />
        case 'go':
            return <FileCode className="w-4 h-4 text-cyan-500" />
        case 'rs':
            return <FileCode className="w-4 h-4 text-orange-600" />
        case 'php':
            return <FileCode className="w-4 h-4 text-indigo-400" />
        case 'rb':
            return <FileCode className="w-4 h-4 text-red-600" />
        case 'kt':
        case 'kts':
            return <FileCode className="w-4 h-4 text-purple-500" />

        // Config / Data
        case 'xml':
        case 'yaml':
        case 'yml':
        case 'toml':
        case 'ini':
        case 'conf':
        case 'properties':
            return <FileCog className="w-4 h-4 text-gray-500" />
        case 'sql':
        case 'db':
        case 'sqlite':
            return <Database className="w-4 h-4 text-blue-400" />
        case 'sh':
        case 'bash':
        case 'zsh':
        case 'bat':
        case 'cmd':
        case 'ps1':
            return <FileTerminal className="w-4 h-4 text-gray-700" />

        // Text / Media
        case 'md':
        case 'txt':
        case 'rtf':
            return <FileText className="w-4 h-4 text-gray-500" />
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
        case 'ico':
        case 'webp':
            return <Image className="w-4 h-4 text-green-500" />
        case 'zip':
        case 'rar':
        case '7z':
        case 'tar':
        case 'gz':
            return <FileArchive className="w-4 h-4 text-yellow-600" />
        case 'csv':
        case 'xlsx':
        case 'xls':
            return <FileSpreadsheet className="w-4 h-4 text-green-600" />

        default:
            return <File className="w-4 h-4 text-muted-foreground" />
    }
}

export function FileNode({ node, style, dragHandle }: NodeRendererProps<NodeData>) {
    const {
        selectedPath,
        selectItem,
        toggleFolder,
        expandedFolders,
        editingNodeId,
        confirmCreate,
        cancelCreate,
        startEditing,
        stopEditing,
        renameItem,
        deleteItem,
        startCreateFile,
        startCreateFolder,
        isCreating,
        openFile
    } = useWorkspaceStore()

    const inputRef = useRef<HTMLInputElement>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const isSelected = selectedPath === node.data.path || selectedPath === node.data.id
    const isFolder = node.data.isFolder
    const isExpanded = expandedFolders.has(node.data.path) || node.data.isOpen || !!node.data.children
    const isNew = node.data._isNew
    const isEditing = editingNodeId === node.data.id

    // Focus input when entering edit mode
    useEffect(() => {
        if ((isEditing || isNew) && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus()
                inputRef.current?.select()
            }, 50)
        }
    }, [isEditing, isNew])

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation()

        if (isEditing || isNew) return

        selectItem(node.data.path)

        if (isFolder) {
            await toggleFolder(node.data.path)
        } else {
            // Open file in editor on single click
            await openFile(node.data.path)
        }
    }

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!isNew) {
            startEditing(node.data.id)
        }
    }

    const handleSubmit = useCallback(async () => {
        if (isSubmitting) return

        const newName = inputRef.current?.value.trim()
        if (!newName) {
            if (isNew) {
                cancelCreate(node.data.id)
            } else {
                stopEditing()
            }
            return
        }

        setIsSubmitting(true)

        try {
            if (isNew) {
                await confirmCreate(node.data.id, newName)
            } else if (newName !== node.data.name) {
                await renameItem(node.data.path, newName)
            } else {
                stopEditing()
            }
        } finally {
            setIsSubmitting(false)
        }
    }, [isSubmitting, isNew, node.data.id, node.data.name, node.data.path, confirmCreate, cancelCreate, renameItem, stopEditing])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation()

        if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
        } else if (e.key === 'Escape') {
            e.preventDefault()
            if (isNew) {
                cancelCreate(node.data.id)
            } else {
                stopEditing()
            }
        }
    }

    const handleBlur = () => {
        if (isSubmitting) return

        if (isNew) {
            cancelCreate(node.data.id)
        } else if (isEditing) {
            const newName = inputRef.current?.value.trim()
            if (newName && newName !== node.data.name) {
                handleSubmit()
            } else {
                stopEditing()
            }
        }
    }

    // Context menu handlers
    const handleNewFile = () => {
        if (isCreating) return
        const parentPath = isFolder ? node.data.path : getParentPath(node.data.path)
        startCreateFile(parentPath)
    }

    const handleNewFolder = () => {
        if (isCreating) return
        const parentPath = isFolder ? node.data.path : getParentPath(node.data.path)
        startCreateFolder(parentPath)
    }

    const handleRename = () => {
        startEditing(node.data.id)
    }

    const handleDelete = async () => {
        if (window.confirm(`Delete "${node.data.name}"?`)) {
            await deleteItem(node.data.path)
        }
    }

    // Helper to get parent path
    function getParentPath(filePath: string): string {
        const parts = filePath.replace(/\\/g, '/').split('/')
        parts.pop()
        return parts.join('/') || parts.join('\\')
    }

    // Edit mode: render input
    if (isEditing || isNew) {
        return (
            <div
                ref={dragHandle}
                style={style}
                className="flex items-center gap-1 px-2 py-1 bg-primary/5"
                onClick={(e) => e.stopPropagation()}
            >
                <span className="w-4 h-4" />
                {isFolder ? (
                    <Folder className="w-4 h-4 text-amber-500" />
                ) : (
                    getFileIcon(node.data.name)
                )}
                <input
                    ref={inputRef}
                    type="text"
                    defaultValue={node.data.name}
                    className="flex-1 text-sm bg-background border border-primary rounded px-1 py-0.5 outline-none min-w-0"
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    disabled={isSubmitting}
                />
                {isNew && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Enter ✓
                    </span>
                )}
            </div>
        )
    }

    // Normal mode: render node with context menu
    return (
        <div ref={dragHandle} style={style}>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        onClick={handleClick}
                        onDoubleClick={handleDoubleClick}
                        className={`
                            flex items-center gap-1.5 px-2 py-0.5 cursor-pointer select-none w-full h-[22px]
                            transition-colors duration-100 ease-in-out
                            ${isSelected ? 'bg-primary/15 text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}
                        `}
                    >
                        {isFolder ? (
                            <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 opacity-70">
                                {isExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                ) : (
                                    <ChevronRight className="w-3 h-3" />
                                )}
                            </span>
                        ) : (
                            <span className="w-4 h-4 flex-shrink-0" />
                        )}

                        <span className="flex-shrink-0">
                            {isFolder ? (
                                isExpanded ? (
                                    <FolderOpen className="w-4 h-4 text-blue-500" />
                                ) : (
                                    <Folder className="w-4 h-4 text-blue-500" />
                                )
                            ) : (
                                getFileIcon(node.data.name)
                            )}
                        </span>

                        <span className="truncate text-[13px] flex-1 min-w-0 leading-none pt-[1px]">
                            {node.data.name}
                        </span>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                    {isFolder && (
                        <>
                            <ContextMenuItem onClick={handleNewFile} disabled={isCreating}>
                                <FilePlus className="w-4 h-4 mr-2" />
                                New File
                            </ContextMenuItem>
                            <ContextMenuItem onClick={handleNewFolder} disabled={isCreating}>
                                <FolderPlus className="w-4 h-4 mr-2" />
                                New Folder
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                        </>
                    )}
                    <ContextMenuItem onClick={handleRename}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Rename
                    </ContextMenuItem>
                    <ContextMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        </div>
    )
}
