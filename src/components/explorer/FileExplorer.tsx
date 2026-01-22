import React, { useEffect, useRef, useMemo, useState, useLayoutEffect } from 'react'
import { Tree, TreeApi } from 'react-arborist'
import { useWorkspaceStore, FileNode as FileNodeType } from '../../stores/workspaceStore'
import { FileNode } from './FileNode'
import { Folder, FolderOpen, RefreshCw, FilePlus, FolderPlus } from 'lucide-react'

// Hook to measure container dimensions with robust fallback
function useContainerSize(ref: React.RefObject<HTMLDivElement>) {
    const [size, setSize] = useState({ width: 0, height: 0 })

    useLayoutEffect(() => {
        const element = ref.current
        if (!element) return

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (!entry) return

            // Use contentRect for precise content box size
            const { width, height } = entry.contentRect

            setSize(prev => {
                if (prev.width !== width || prev.height !== height) {
                    return { width, height }
                }
                return prev
            })
        })

        observer.observe(element)
        return () => observer.disconnect()
    }, [ref])

    return size
}



export const FileExplorer: React.FC = () => {
    const {
        rootPath,
        rootName,
        tree,
        expandedFolders,
        isLoading,
        isCreating,  // NEW: track creation in progress
        openFolder,
        loadLastWorkspace,
        refresh,
        startCreateFile,
        startCreateFolder
    } = useWorkspaceStore()

    const treeRef = useRef<TreeApi<any>>(null)
    const treeContainerRef = useRef<HTMLDivElement>(null)
    const containerSize = useContainerSize(treeContainerRef)

    // Load last workspace on mount
    useEffect(() => {
        loadLastWorkspace()
    }, [loadLastWorkspace])

    // Subscribe to FS changes
    useEffect(() => {
        const unsubscribe = window.electronAPI.fs.onFsChange((data) => {
            useWorkspaceStore.getState().handleFsChange(data.event, data.path)
        })
        return unsubscribe
    }, [])

    // MEMOIZE tree data to prevent unnecessary re-renders
    // This is critical to prevent input blur when tree re-renders
    const treeData = useMemo(() => {
        return tree.map(node => nodeToArborist(node, expandedFolders))
    }, [tree, expandedFolders])

    // After tree data updates, restore open state using imperative API
    useEffect(() => {
        if (treeRef.current && expandedFolders.size > 0) {
            setTimeout(() => {
                expandedFolders.forEach(folderPath => {
                    const node = treeRef.current?.get(folderPath)
                    if (node && !node.isOpen) {
                        node.open()
                    }
                })
            }, 10)
        }
    }, [treeData, expandedFolders])

    // Empty state - no folder open
    if (!rootPath) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-4 text-muted-foreground">
                <Folder className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm mb-4 text-center">No folder open</p>
                <button
                    onClick={openFolder}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
                >
                    Open Folder
                </button>
            </div>
        )
    }
    // Determine the target parent folder based on current selection
    const getTargetParentPath = (): string => {
        const { selectedPath, tree, expandedFolders } = useWorkspaceStore.getState()

        if (!selectedPath || !rootPath) return rootPath!

        // Helper to find a node by path
        const findNode = (nodes: typeof tree, path: string): typeof tree[0] | null => {
            for (const node of nodes) {
                if (node.path === path) return node
                if (node.children) {
                    const found = findNode(node.children, path)
                    if (found) return found
                }
            }
            return null
        }

        const selectedNode = findNode(tree, selectedPath)

        if (!selectedNode) return rootPath

        if (selectedNode.isFolder) {
            // If a folder is selected and expanded, create inside it
            // If collapsed, create in root (or we could expand it first)
            if (expandedFolders.has(selectedPath)) {
                return selectedPath
            }
            return rootPath
        } else {
            // If a file is selected, create in its parent folder
            // For simplicity, we need to find the parent path
            const parts = selectedPath.replace(/\\/g, '/').split('/')
            parts.pop()
            const parentPath = parts.join('/') || parts.join('\\')

            // Check if this parent is expanded (visible)
            if (parentPath === rootPath.replace(/\\/g, '/') || parentPath === rootPath) {
                return rootPath
            }
            return parentPath || rootPath
        }
    }

    // Handle "New File" button - creates in selected folder or root
    const handleCreateFile = () => {
        const targetPath = getTargetParentPath()
        console.log('Creating new file at:', targetPath)
        startCreateFile(targetPath)
    }

    // Handle "New Folder" button - creates in selected folder or root
    const handleCreateFolder = () => {
        const targetPath = getTargetParentPath()
        console.log('Creating new folder at:', targetPath)
        startCreateFolder(targetPath)
    }
    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate" title={rootPath}>
                        {rootName}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={refresh}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        title="Refresh"
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleCreateFile}
                        disabled={isCreating}
                        className={`p-1 rounded transition-colors ${isCreating ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted'}`}
                        title={isCreating ? "Finish current creation first" : "New File"}
                    >
                        <FilePlus className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleCreateFolder}
                        disabled={isCreating}
                        className={`p-1 rounded transition-colors ${isCreating ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted'}`}
                        title={isCreating ? "Finish current creation first" : "New Folder"}
                    >
                        <FolderPlus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Tree View */}
            <div className="flex-1 relative min-h-0">
                <div ref={treeContainerRef} className="file-tree-container">
                    {treeData.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                            Empty folder
                        </div>
                    ) : (
                        <Tree
                            ref={treeRef}
                            data={treeData}
                            width={containerSize.width || 300}
                            height={containerSize.height || 500}
                            indent={12}
                            rowHeight={22}
                            openByDefault={false}
                            idAccessor="id"
                        >
                            {FileNode}
                        </Tree>
                    )}
                </div>
            </div>
        </div>
    )
}

// Helper: Convert our FileNode to react-arborist format with isOpen state
function nodeToArborist(node: FileNodeType, expandedFolders: Set<string>): any {
    const isOpen = expandedFolders.has(node.path)
    return {
        id: node.id,
        name: node.name,
        path: node.path,
        isFolder: node.isFolder,
        isOpen: isOpen,
        _isNew: node._isNew,
        children: node.children?.map(child => nodeToArborist(child, expandedFolders))
    }
}
