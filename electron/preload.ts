import { contextBridge, ipcRenderer } from 'electron'

// File node type
interface FileNode {
    id: string
    name: string
    path: string
    isFolder: boolean
    children?: FileNode[]
}

interface FsChangeEvent {
    event: string
    path: string
}

interface WorkspaceResult {
    path: string
    name: string
    items: FileNode[]
}

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

    // AI Service
    sendMessage: (
        message: string,
        images: string[],
        modelName: string,
        conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>,
        systemPrompt: string
    ): Promise<string> =>
        ipcRenderer.invoke('ai:sendMessage', message, images, modelName, conversationHistory, systemPrompt),

    selectImage: (): Promise<string | null> =>
        ipcRenderer.invoke('dialog:selectImage'),

    onAiChunk: (callback: (text: string) => void): (() => void) => {
        const subscription = (_event: Electron.IpcRendererEvent, text: string) => callback(text)
        ipcRenderer.on('ai:chunk', subscription)
        return () => ipcRenderer.removeListener('ai:chunk', subscription)
    },

    // Apply a proposed edit
    applyEdit: (path: string, content: string): Promise<boolean> =>
        ipcRenderer.invoke('ai:applyEdit', path, content),

    // File System API
    fs: {
        openFolder: (): Promise<WorkspaceResult | null> =>
            ipcRenderer.invoke('fs:openFolder'),

        getLastWorkspace: (): Promise<WorkspaceResult | null> =>
            ipcRenderer.invoke('fs:getLastWorkspace'),

        readDir: (dirPath: string): Promise<FileNode[]> =>
            ipcRenderer.invoke('fs:readDir', dirPath),

        createFile: (parentPath: string, name: string): Promise<FileNode> =>
            ipcRenderer.invoke('fs:createFile', parentPath, name),

        createFolder: (parentPath: string, name: string): Promise<FileNode> =>
            ipcRenderer.invoke('fs:createFolder', parentPath, name),

        rename: (oldPath: string, newName: string): Promise<{ oldPath: string; newPath: string; name: string }> =>
            ipcRenderer.invoke('fs:rename', oldPath, newName),

        delete: (targetPath: string): Promise<{ path: string }> =>
            ipcRenderer.invoke('fs:delete', targetPath),

        move: (sourcePath: string, destFolder: string): Promise<{ oldPath: string; newPath: string }> =>
            ipcRenderer.invoke('fs:move', sourcePath, destFolder),

        // Subscribe to file system changes
        onFsChange: (callback: (data: FsChangeEvent) => void): (() => void) => {
            const subscription = (_event: Electron.IpcRendererEvent, data: FsChangeEvent) => callback(data)
            ipcRenderer.on('fs:changed', subscription)
            return () => ipcRenderer.removeListener('fs:changed', subscription)
        },

        // Read file content
        readFile: (filePath: string): Promise<string> =>
            ipcRenderer.invoke('fs:readFile', filePath),

        // Write file content
        writeFile: (filePath: string, content: string): Promise<boolean> =>
            ipcRenderer.invoke('fs:writeFile', filePath, content)
    },

    // Terminal API
    terminal: {
        create: (options?: { cwd?: string }) => ipcRenderer.invoke('terminal:create', options),
        write: (data: string) => ipcRenderer.send('terminal:write', data),
        resize: (cols: number, rows: number) => ipcRenderer.send('terminal:resize', cols, rows),
        onIncoming: (callback: (data: string) => void) => {
            const subscription = (_: any, data: string) => callback(data)
            ipcRenderer.on('terminal:incoming', subscription)
            return () => ipcRenderer.removeListener('terminal:incoming', subscription)
        }
    }
})

// Type declarations for renderer
declare global {
    interface Window {
        electronAPI: {
            minimize: () => void
            maximize: () => void
            close: () => void
            isMaximized: () => Promise<boolean>
            sendMessage: (
                message: string,
                images: string[],
                modelName: string,
                conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>,
                systemPrompt: string
            ) => Promise<string>
            selectImage: () => Promise<string | null>
            onAiChunk: (callback: (text: string) => void) => () => void
            applyEdit: (path: string, content: string) => Promise<boolean>
            fs: {
                openFolder: () => Promise<WorkspaceResult | null>
                getLastWorkspace: () => Promise<WorkspaceResult | null>
                readDir: (dirPath: string) => Promise<FileNode[]>
                createFile: (parentPath: string, name: string) => Promise<FileNode>
                createFolder: (parentPath: string, name: string) => Promise<FileNode>
                rename: (oldPath: string, newName: string) => Promise<{ oldPath: string; newPath: string; name: string }>
                delete: (targetPath: string) => Promise<{ path: string }>
                move: (sourcePath: string, destFolder: string) => Promise<{ oldPath: string; newPath: string }>
                onFsChange: (callback: (data: FsChangeEvent) => void) => () => void
                readFile: (filePath: string) => Promise<string>
                writeFile: (filePath: string, content: string) => Promise<boolean>
            }
            terminal: {
                create: (options?: { cwd?: string }) => Promise<boolean>
                write: (data: string) => void
                resize: (cols: number, rows: number) => void
                onIncoming: (callback: (data: string) => void) => () => void
            }
        }
    }
}
