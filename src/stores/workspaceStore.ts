import { create } from 'zustand'

// File node type - matches main process
export interface FileNode {
    id: string
    name: string
    path: string
    isFolder: boolean
    children?: FileNode[]
    // UI-only flags
    _isNew?: boolean      // Temp node being created
    _isEditing?: boolean  // Node is in edit mode
}

interface WorkspaceState {
    // State
    rootPath: string | null
    rootName: string | null
    tree: FileNode[]
    expandedFolders: Set<string>
    selectedPath: string | null
    isLoading: boolean
    editingNodeId: string | null  // Track which node is being edited
    isCreating: boolean  // Track if file/folder creation is in progress

    // Editor state
    activeFileId: string | null // Current active tab (file path)
    openFiles: string[]         // List of open file paths (tabs)
    fileContents: Record<string, string> // Map of file path -> content
    isFileLoading: boolean
    fileError: string | null
    unsavedFiles: Set<string>   // Paths of files with unsaved changes

    // Actions
    updateActiveFileContent: (content: string) => void
    saveActiveFile: () => Promise<void>
    openFolder: () => Promise<void>
    loadLastWorkspace: () => Promise<void>
    toggleFolder: (folderPath: string) => Promise<void>
    selectItem: (path: string | null) => void

    // Create actions - adds temp node to tree
    startCreateFile: (parentPath: string) => void
    startCreateFolder: (parentPath: string) => void
    confirmCreate: (tempId: string, name: string) => Promise<void>
    cancelCreate: (tempId: string) => void

    // Existing file operations
    renameItem: (oldPath: string, newName: string) => Promise<void>
    deleteItem: (targetPath: string) => Promise<void>
    moveItem: (sourcePath: string, destFolder: string) => Promise<void>
    refresh: () => Promise<void>
    refreshFolder: (folderPath: string) => Promise<void>

    // Edit mode
    startEditing: (nodeId: string) => void
    stopEditing: () => void

    // Internal: Update tree after FS changes
    handleFsChange: (event: string, changedPath: string) => void

    // File opening for editor
    openFile: (path: string) => Promise<void>
    closeFile: (path: string) => void

    // UI functionality
    isTerminalOpen: boolean
    toggleTerminal: () => void
    runActiveFile: () => Promise<void>

    // Status bar
    cursorPosition: { line: number; column: number }
    setCursorPosition: (line: number, column: number) => void
}

// Helper: Update children of a folder in the tree recursively
function updateTreeChildren(
    tree: FileNode[],
    folderPath: string,
    newChildren: FileNode[] | undefined
): FileNode[] {
    return tree.map(node => {
        if (node.path === folderPath) {
            return { ...node, children: newChildren }
        }
        if (node.children) {
            return { ...node, children: updateTreeChildren(node.children, folderPath, newChildren) }
        }
        return node
    })
}

// Helper: Add node to tree at specific location
function addNodeToTree(tree: FileNode[], parentPath: string | null, newNode: FileNode, rootPath: string): FileNode[] {
    // If parentPath is null or equals rootPath, add to root
    if (!parentPath || parentPath === rootPath) {
        return [newNode, ...tree]
    }

    // Otherwise, find parent and add to its children
    return tree.map(node => {
        if (node.path === parentPath) {
            return { ...node, children: [newNode, ...(node.children || [])] }
        }
        if (node.children) {
            return { ...node, children: addNodeToTree(node.children, parentPath, newNode, rootPath) }
        }
        return node
    })
}

// Helper: Remove node from tree
function removeNodeFromTree(tree: FileNode[], nodeId: string): FileNode[] {
    return tree
        .filter(node => node.id !== nodeId)
        .map(node => {
            if (node.children) {
                return { ...node, children: removeNodeFromTree(node.children, nodeId) }
            }
            return node
        })
}

// Helper: Find parent path of a file/folder
function getParentPath(filePath: string): string {
    const parts = filePath.replace(/\\/g, '/').split('/')
    parts.pop()
    return parts.join('/')
}

// Debounce helper
let refreshTimeout: ReturnType<typeof setTimeout> | null = null

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
    rootPath: null,
    rootName: null,
    tree: [],
    expandedFolders: new Set<string>(),
    selectedPath: null,
    isLoading: false,
    editingNodeId: null,
    isCreating: false,

    // Editor state
    activeFileId: null,
    openFiles: [],
    fileContents: {},
    isFileLoading: false,
    fileError: null,
    unsavedFiles: new Set<string>(),

    // UI State
    isTerminalOpen: false,
    toggleTerminal: () => set(state => ({ isTerminalOpen: !state.isTerminalOpen })),

    // Status bar state
    cursorPosition: { line: 1, column: 1 },
    setCursorPosition: (line: number, column: number) => set({ cursorPosition: { line, column } }),

    runActiveFile: async () => {
        const { activeFileId, isTerminalOpen } = get()
        if (!activeFileId) return

        // 1. Ensure terminal is open
        if (!isTerminalOpen) {
            set({ isTerminalOpen: true })
        }

        // 2. Determine command based on extension
        const ext = activeFileId.split('.').pop()?.toLowerCase()
        const fileName = activeFileId.split(/[\\/]/).pop()

        // Quote the file path to handle spaces
        // We use the full path if we can, or relative if we are in root.
        // For simplicity in MVP, we just assume we are in root or just run blindly.
        // Better: Quote the full path.
        const quotedPath = `"${activeFileId}"`

        let command = ''

        switch (ext) {
            case 'js':
                command = `node ${quotedPath}`
                break
            case 'ts':
                command = `npx ts-node ${quotedPath}`
                break
            case 'py':
                // Try python3 first, then python (or just python on windows often works)
                // For MVP Windows focus: python is common
                command = `python ${quotedPath}`
                break
            case 'java':
                // Simple single-file java run (Java 11+)
                command = `java ${quotedPath}`
                break
            case 'c':
            case 'cpp':
                // Basic compile and run. 
                // Note: Windows output is .exe.
                const outName = 'program.exe'
                command = `gcc ${quotedPath} -o ${outName} && .\\${outName}`
                break
            case 'go':
                command = `go run ${quotedPath}`
                break
            case 'rs':
                command = `rustc ${quotedPath} && .\\${fileName?.replace('.rs', '.exe')}`
                break
            case 'sh':
                command = `bash ${quotedPath}`
                break
            default:
                command = `echo "No runner configured for .${ext} files"`
        }

        // 3. Send command to terminal
        // Add a small delay if we just opened the terminal to ensure it's ready
        if (!isTerminalOpen) {
            await new Promise(resolve => setTimeout(resolve, 500))
        }

        // Send clear signal first? Optional. Maybe just newline.
        window.electronAPI.terminal.write(`\r\n${command}\r\n`)
    },

    updateActiveFileContent: (content: string) => {
        const { activeFileId, unsavedFiles, fileContents } = get()
        if (!activeFileId) return

        const newUnsaved = new Set(unsavedFiles)
        newUnsaved.add(activeFileId)

        set({
            fileContents: { ...fileContents, [activeFileId]: content },
            unsavedFiles: newUnsaved
        })
    },

    saveActiveFile: async () => {
        const { activeFileId, fileContents, unsavedFiles } = get()
        if (!activeFileId) return

        const content = fileContents[activeFileId]
        if (content === undefined) return

        try {
            await window.electronAPI.fs.writeFile(activeFileId, content)

            const newUnsaved = new Set(unsavedFiles)
            newUnsaved.delete(activeFileId)
            set({ unsavedFiles: newUnsaved })
        } catch (error) {
            console.error('Failed to save file:', error)
        }
    },

    openFolder: async () => {
        set({ isLoading: true })
        try {
            const result = await window.electronAPI.fs.openFolder()
            if (result) {
                set({
                    rootPath: result.path,
                    rootName: result.name,
                    tree: result.items,
                    expandedFolders: new Set<string>(),
                    selectedPath: null,
                    editingNodeId: null,
                    // Reset editor state on new workspace
                    activeFileId: null,
                    openFiles: [],
                    fileContents: {},
                    unsavedFiles: new Set<string>()
                })
            }
        } catch (error) {
            console.error('Failed to open folder:', error)
        } finally {
            set({ isLoading: false })
        }
    },

    loadLastWorkspace: async () => {
        set({ isLoading: true })
        try {
            const result = await window.electronAPI.fs.getLastWorkspace()
            if (result) {
                set({
                    rootPath: result.path,
                    rootName: result.name,
                    tree: result.items,
                    expandedFolders: new Set<string>()
                })
            }
        } catch (error) {
            console.error('Failed to load last workspace:', error)
        } finally {
            set({ isLoading: false })
        }
    },

    toggleFolder: async (folderPath: string) => {
        const { expandedFolders, tree } = get()
        const isExpanded = expandedFolders.has(folderPath)

        if (isExpanded) {
            // Collapse: remove children and update expanded set
            const newExpanded = new Set(expandedFolders)
            newExpanded.delete(folderPath)
            set({
                tree: updateTreeChildren(tree, folderPath, undefined),
                expandedFolders: newExpanded
            })
        } else {
            // Expand: fetch children
            try {
                const children = await window.electronAPI.fs.readDir(folderPath)
                const newExpanded = new Set(expandedFolders)
                newExpanded.add(folderPath)
                set({
                    tree: updateTreeChildren(get().tree, folderPath, children),
                    expandedFolders: newExpanded
                })
            } catch (error) {
                console.error('Failed to expand folder:', error)
            }
        }
    },

    selectItem: (path: string | null) => {
        set({ selectedPath: path })
    },

    // Add temp file node to tree and enter edit mode
    startCreateFile: (parentPath: string) => {
        const { tree, rootPath, isCreating } = get()
        if (!rootPath) return

        // Block if already creating
        if (isCreating) return

        // Clear any existing temp nodes first
        const cleanedTree = tree.filter(n => !n._isNew)
        const cleanedTreeDeep = cleanedTree.map(n =>
            n.children ? { ...n, children: n.children.filter(c => !c._isNew) } : n
        )

        const tempId = `__temp_file_${Date.now()}`
        const tempNode: FileNode = {
            id: tempId,
            name: 'untitled.txt',
            path: tempId,
            isFolder: false,
            _isNew: true
        }

        set({
            tree: addNodeToTree(cleanedTreeDeep, parentPath, tempNode, rootPath),
            editingNodeId: tempId,
            selectedPath: tempId,
            isCreating: true
        })
    },

    // Add temp folder node to tree and enter edit mode
    startCreateFolder: (parentPath: string) => {
        const { tree, rootPath, isCreating } = get()
        if (!rootPath) return

        // Block if already creating
        if (isCreating) return

        // Clear any existing temp nodes first
        const cleanedTree = tree.filter(n => !n._isNew)
        const cleanedTreeDeep = cleanedTree.map(n =>
            n.children ? { ...n, children: n.children.filter(c => !c._isNew) } : n
        )

        const tempId = `__temp_folder_${Date.now()}`
        const tempNode: FileNode = {
            id: tempId,
            name: 'New Folder',
            path: tempId,
            isFolder: true,
            _isNew: true
        }

        set({
            tree: addNodeToTree(cleanedTreeDeep, parentPath, tempNode, rootPath),
            editingNodeId: tempId,
            selectedPath: tempId,
            isCreating: true
        })
    },

    // Confirm creation - create file on disk
    confirmCreate: async (tempId: string, name: string) => {
        const { tree, rootPath } = get()
        if (!rootPath) return

        // Find the temp node to get its type and parent
        const findNode = (nodes: FileNode[], id: string): { node: FileNode, parentPath: string } | null => {
            for (const node of nodes) {
                if (node.id === id) {
                    return { node, parentPath: rootPath }
                }
                if (node.children) {
                    for (const child of node.children) {
                        if (child.id === id) {
                            return { node: child, parentPath: node.path }
                        }
                        const found = findNode([child], id)
                        if (found) return found
                    }
                }
            }
            return null
        }

        const result = findNode(tree, tempId)
        if (!result) {
            console.error('Temp node not found:', tempId)
            return
        }

        const { node: tempNode, parentPath } = result

        try {
            if (tempNode.isFolder) {
                await window.electronAPI.fs.createFolder(parentPath, name)
            } else {
                await window.electronAPI.fs.createFile(parentPath, name)
            }

            // Remove temp node and refresh parent
            set({
                tree: removeNodeFromTree(get().tree, tempId),
                editingNodeId: null,
                isCreating: false
            })

            // Refresh to show the new file
            await get().refreshFolder(parentPath)
        } catch (error) {
            console.error('Failed to create:', error)
            // Remove temp node on error
            set({
                tree: removeNodeFromTree(get().tree, tempId),
                editingNodeId: null,
                isCreating: false
            })
        }
    },

    // Cancel creation - remove temp node
    cancelCreate: (tempId: string) => {
        const { tree } = get()
        set({
            tree: removeNodeFromTree(tree, tempId),
            editingNodeId: null,
            isCreating: false
        })
    },

    startEditing: (nodeId: string) => {
        set({ editingNodeId: nodeId })
    },

    stopEditing: () => {
        set({ editingNodeId: null })
    },

    renameItem: async (oldPath: string, newName: string) => {
        try {
            await window.electronAPI.fs.rename(oldPath, newName)
            const parentPath = getParentPath(oldPath)
            set({ editingNodeId: null })
            await get().refreshFolder(parentPath)
        } catch (error) {
            console.error('Failed to rename:', error)
        }
    },

    deleteItem: async (targetPath: string) => {
        try {
            const { selectedPath } = get()
            await window.electronAPI.fs.delete(targetPath)

            const parentPath = getParentPath(targetPath)
            await get().refreshFolder(parentPath)

            if (selectedPath === targetPath) {
                set({ selectedPath: null })
            }
        } catch (error) {
            console.error('Failed to delete:', error)
        }
    },

    moveItem: async (sourcePath: string, destFolder: string) => {
        try {
            await window.electronAPI.fs.move(sourcePath, destFolder)
            const sourceParent = getParentPath(sourcePath)
            await get().refreshFolder(sourceParent)
            await get().refreshFolder(destFolder)
        } catch (error) {
            console.error('Failed to move:', error)
        }
    },

    refresh: async () => {
        const { rootPath } = get()
        if (!rootPath) return

        set({ isLoading: true })
        try {
            const items = await window.electronAPI.fs.readDir(rootPath)
            set({ tree: items })

            const { expandedFolders } = get()
            for (const folderPath of expandedFolders) {
                try {
                    const children = await window.electronAPI.fs.readDir(folderPath)
                    set({ tree: updateTreeChildren(get().tree, folderPath, children) })
                } catch {
                    const newExpanded = new Set(expandedFolders)
                    newExpanded.delete(folderPath)
                    set({ expandedFolders: newExpanded })
                }
            }
        } catch (error) {
            console.error('Failed to refresh:', error)
        } finally {
            set({ isLoading: false })
        }
    },

    refreshFolder: async (folderPath: string) => {
        const { rootPath, expandedFolders, tree } = get()
        if (!rootPath) return

        const normalizedFolderPath = folderPath.replace(/\\/g, '/')
        const normalizedRootPath = rootPath.replace(/\\/g, '/')

        if (normalizedFolderPath === normalizedRootPath || folderPath === rootPath) {
            const items = await window.electronAPI.fs.readDir(rootPath)
            set({ tree: items })

            for (const folder of items.filter(i => i.isFolder)) {
                if (expandedFolders.has(folder.path)) {
                    const children = await window.electronAPI.fs.readDir(folder.path)
                    set({ tree: updateTreeChildren(get().tree, folder.path, children) })
                }
            }
        } else if (expandedFolders.has(folderPath)) {
            const children = await window.electronAPI.fs.readDir(folderPath)
            set({ tree: updateTreeChildren(tree, folderPath, children) })
        }
    },

    handleFsChange: (event: string, changedPath: string) => {
        // DON'T refresh while user is editing - it will interrupt their input
        const { editingNodeId, tree } = get()

        // Check if there are any temp nodes being created
        const hasTempNodes = tree.some(n => n._isNew) ||
            tree.some(n => n.children?.some(c => c._isNew))

        if (editingNodeId || hasTempNodes) {
            console.log('[FS Change] Blocked - editing in progress')
            return
        }

        console.log('[FS Change]', event, changedPath)

        if (refreshTimeout) {
            clearTimeout(refreshTimeout)
        }

        refreshTimeout = setTimeout(() => {
            const parentPath = getParentPath(changedPath)
            get().refreshFolder(parentPath)
        }, 300)
    },

    // Open file in editor (Tab)
    openFile: async (path: string) => {
        const { openFiles, fileContents, activeFileId } = get()

        // If not in open files, add it
        let newOpenFiles = openFiles
        if (!openFiles.includes(path)) {
            newOpenFiles = [...openFiles, path]
        }

        // Set pending (switch to tab immediately)
        set({
            activeFileId: path,
            openFiles: newOpenFiles,
            fileError: null
        })

        // Check binary
        const binaryExtensions = [
            'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'svg',
            'mp3', 'mp4', 'wav', 'avi', 'mov', 'mkv',
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
            'zip', 'rar', '7z', 'tar', 'gz',
            'exe', 'dll', 'so', 'dylib',
            'woff', 'woff2', 'ttf', 'otf', 'eot'
        ]
        const ext = path.split('.').pop()?.toLowerCase() || ''
        if (binaryExtensions.includes(ext)) {
            set({ fileError: `Cannot open binary file: .${ext}`, isFileLoading: false })
            // Logic note: Should we still keep the tab? VS Code does, but shows error. 
            // For MVP, we'll keep the tab open but show error in the editor area.
            return
        }

        // Use cached content if available
        if (fileContents[path] !== undefined) {
            return
        }

        // Otherwise load content
        set({ isFileLoading: true })
        try {
            const content = await window.electronAPI.fs.readFile(path)
            set({
                fileContents: { ...get().fileContents, [path]: content },
                isFileLoading: false
            })
        } catch (error: any) {
            console.error('[openFile] Failed:', error)
            const errorMessage = error?.message || 'Failed to open file'
            set({
                fileError: errorMessage,
                isFileLoading: false
            })
        }
    },

    closeFile: (path: string) => {
        const { openFiles, activeFileId, fileContents, unsavedFiles } = get()

        const newOpenFiles = openFiles.filter(p => p !== path)
        const newFileContents = { ...fileContents }
        delete newFileContents[path] // Clean up cache

        // Also remove from unsaved files
        const newUnsavedFiles = new Set(unsavedFiles)
        if (newUnsavedFiles.has(path)) {
            newUnsavedFiles.delete(path)
        }

        let newActiveId = activeFileId

        // If closing the active file, switch to another
        if (activeFileId === path) {
            if (newOpenFiles.length > 0) {
                // Try to find the one to the left, or the first one
                const index = openFiles.indexOf(path)
                // If it was the last one, pick the new last one
                if (index >= newOpenFiles.length) {
                    newActiveId = newOpenFiles[newOpenFiles.length - 1]
                } else {
                    newActiveId = newOpenFiles[index]
                }
            } else {
                newActiveId = null
            }
        }

        set({
            openFiles: newOpenFiles,
            fileContents: newFileContents,
            activeFileId: newActiveId,
            unsavedFiles: newUnsavedFiles
        })
    }
}))
