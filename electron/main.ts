import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, resolve, basename, dirname } from 'path'
import * as fs from 'fs/promises'
import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'
import chokidar from 'chokidar'
import Store from 'electron-store'

// Explicitly load .env from project root logic
// In development, __dirname is usually under /out/main or /electron
// We'll try to find .env in the project root.
dotenv.config({ path: join(__dirname, '../../.env') })
// Fallback for default location just in case
dotenv.config()

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        frame: false, // Frameless for VS Code style
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 15, y: 15 },
        backgroundColor: '#ffffff',
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    })

    // Load the app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173')
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

// Window control IPC handlers
ipcMain.on('window:minimize', () => {
    mainWindow?.minimize()
})

ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize()
    } else {
        mainWindow?.maximize()
    }
})

ipcMain.on('window:close', () => {
    mainWindow?.close()
})

ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() ?? false
})

// Image Selection Handler
ipcMain.handle('dialog:selectImage', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
        ]
    })

    if (result.canceled || result.filePaths.length === 0) {
        return null
    }

    const filePath = result.filePaths[0]
    const fileExt = filePath.split('.').pop()?.toLowerCase() || 'png'

    // Normalize extension for MIMETypes
    let mimeType = `image/${fileExt}`
    if (fileExt === 'jpg') mimeType = 'image/jpeg'

    const imageBuffer = await fs.readFile(filePath)
    const base64Image = imageBuffer.toString('base64')

    // Return Data URI
    return `data:${mimeType};base64,${base64Image}`
})

// ============================================
// AI TOOL DEFINITIONS
// ============================================

const AI_TOOLS: any[] = [
    {
        name: 'read_file',
        description: 'Read the contents of a file from the current workspace. Use this when you need to see code from a file that is not currently open.',
        input_schema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Relative path to the file from the workspace root (e.g., "src/main/java/h02/ScanRobot.java")'
                }
            },
            required: ['path']
        }
    },
    {
        name: 'list_directory',
        description: 'List the contents of a directory in the workspace.',
        input_schema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Relative path to the directory (e.g., "src/main/java/h02"). Use empty string for root.'
                }
            },
            required: ['path']
        }
    },
    {
        name: 'write_file',
        description: 'Create a new file or completely overwrite an existing file with new content. Use this to create new files or when you need to replace the entire file content.',
        input_schema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Relative path to the file (e.g., "src/main/java/h02/NewClass.java")'
                },
                content: {
                    type: 'string',
                    description: 'The complete content to write to the file'
                }
            },
            required: ['path', 'content']
        }
    },
    {
        name: 'edit_file',
        description: 'Make targeted edits to an existing file by replacing specific text. Use this for small, precise changes rather than rewriting the entire file.',
        input_schema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Relative path to the file to edit'
                },
                edits: {
                    type: 'array',
                    description: 'Array of edit operations to perform',
                    items: {
                        type: 'object',
                        properties: {
                            old_text: {
                                type: 'string',
                                description: 'The exact text to find and replace (must match exactly including whitespace)'
                            },
                            new_text: {
                                type: 'string',
                                description: 'The replacement text'
                            }
                        },
                        required: ['old_text', 'new_text']
                    }
                }
            },
            required: ['path', 'edits']
        }
    }
]

// Get current workspace path from store
let currentWorkspacePath: string | null = null

// Tool execution function
async function executeAITool(toolName: string, toolInput: any): Promise<string> {
    try {
        switch (toolName) {
            case 'read_file': {
                const filePath = toolInput.path as string
                const fullPath = currentWorkspacePath
                    ? join(currentWorkspacePath, filePath)
                    : filePath

                const content = await fs.readFile(fullPath, 'utf-8')
                const lines = content.split('\n')
                const numberedLines = lines.map((line, i) => `${String(i + 1).padStart(4, ' ')} | ${line}`)
                return `File: ${filePath}\n\n${numberedLines.join('\n')}`
            }

            case 'list_directory': {
                const dirPath = toolInput.path as string
                const fullPath = currentWorkspacePath
                    ? join(currentWorkspacePath, dirPath || '')
                    : dirPath || '.'

                const entries = await fs.readdir(fullPath, { withFileTypes: true })
                const listing = entries.map(entry => {
                    const icon = entry.isDirectory() ? '📁' : '📄'
                    return `${icon} ${entry.name}`
                }).join('\n')

                return `Directory: ${dirPath || '/'}\n\n${listing}`
            }

            case 'write_file': {
                const filePath = toolInput.path as string
                const newContent = toolInput.content as string
                const fullPath = currentWorkspacePath
                    ? join(currentWorkspacePath, filePath)
                    : filePath

                // Try to read existing content for diff
                let originalContent = ''
                try {
                    originalContent = await fs.readFile(fullPath, 'utf-8')
                } catch {
                    // File doesn't exist, that's fine
                }

                // Return proposed change as JSON marker for frontend to parse
                const editId = `edit-${Date.now()}`
                const proposedEdit = {
                    __proposed_edit__: true,
                    id: editId,
                    type: 'write',
                    path: fullPath,
                    relativePath: filePath,
                    originalContent,
                    newContent
                }

                return `\n\n[DIFF_BLOCK]${JSON.stringify(proposedEdit)}[/DIFF_BLOCK]\n\nI've prepared changes for **${filePath}**. Please review and accept or reject the edit above.`
            }

            case 'edit_file': {
                const filePath = toolInput.path as string
                const edits = toolInput.edits as Array<{ old_text: string; new_text: string }>
                const fullPath = currentWorkspacePath
                    ? join(currentWorkspacePath, filePath)
                    : filePath

                // Read current content
                const originalContent = await fs.readFile(fullPath, 'utf-8')
                let newContent = originalContent
                let editCount = 0

                // Apply each edit to preview
                for (const edit of edits) {
                    if (newContent.includes(edit.old_text)) {
                        newContent = newContent.replace(edit.old_text, edit.new_text)
                        editCount++
                    }
                }

                if (editCount === 0) {
                    return `⚠️ No matches found in ${filePath}. The old_text must match exactly.`
                }

                // Return proposed change as JSON marker for frontend to parse
                const editId = `edit-${Date.now()}`
                const proposedEdit = {
                    __proposed_edit__: true,
                    id: editId,
                    type: 'edit',
                    path: fullPath,
                    relativePath: filePath,
                    originalContent,
                    newContent
                }

                return `\n\n[DIFF_BLOCK]${JSON.stringify(proposedEdit)}[/DIFF_BLOCK]\n\nI've prepared ${editCount} edit(s) for **${filePath}**. Please review and accept or reject the changes above.`
            }

            default:
                return `Unknown tool: ${toolName}`
        }
    } catch (error: any) {
        return `Error executing ${toolName}: ${error.message}`
    }
}

// Apply edit IPC handler (for deferred approval)
ipcMain.handle('ai:applyEdit', async (_, path: string, content: string) => {
    try {
        // Ensure directory exists
        const dirPath = dirname(path)
        await fs.mkdir(dirPath, { recursive: true })

        // Write the file
        await fs.writeFile(path, content, 'utf-8')

        // Notify frontend about file change
        mainWindow?.webContents.send('fs:change', { event: 'change', path })

        return true
    } catch (error: any) {
        console.error('Apply edit error:', error)
        return false
    }
})

// AI Service IPC handler with Tool Calling
ipcMain.handle('ai:sendMessage', async (
    _,
    message: string,
    images: string[],
    modelName: string,
    conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>,
    systemPrompt: string
) => {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
        throw new Error('Configuration Error: ANTHROPIC_API_KEY is missing. Please add it to your .env file.')
    }

    // Extract workspace path from system prompt (simple heuristic)
    const pathMatch = systemPrompt.match(/\*\*Path\*\*: (.+)/m)
    if (pathMatch) {
        currentWorkspacePath = pathMatch[1].trim()
    }

    try {
        const anthropic = new Anthropic({ apiKey })

        // Build the messages array from conversation history
        const apiMessages: any[] = []

        // Add previous conversation history
        for (const msg of conversationHistory) {
            apiMessages.push({
                role: msg.role,
                content: msg.content
            })
        }

        // Prepare current message content (may include images)
        let currentContent: any[] = []

        // Add images first (Anthropic recommendation)
        if (images && images.length > 0) {
            images.forEach(imgDataUri => {
                const matches = imgDataUri.match(/^data:(image\/\w+);base64,(.+)$/)
                if (matches) {
                    const mediaType = matches[1] as any
                    const data = matches[2]

                    currentContent.push({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mediaType,
                            data: data
                        }
                    })
                }
            })
        }

        // Add text prompt
        if (message) {
            currentContent.push({
                type: 'text',
                text: message
            })
        }

        // Add current user message
        apiMessages.push({
            role: 'user',
            content: currentContent.length === 1 && currentContent[0].type === 'text'
                ? message
                : currentContent
        })

        let fullText = ''

        // Tool calling loop - keep going until we get a final response
        while (true) {
            // Make API call with tools
            const response = await anthropic.messages.create({
                model: modelName,
                max_tokens: 4096,
                system: systemPrompt || undefined,
                messages: apiMessages,
                tools: AI_TOOLS,
            })

            // Check stop reason
            if (response.stop_reason === 'end_turn') {
                // Normal completion - extract text
                for (const block of response.content) {
                    if (block.type === 'text') {
                        fullText += block.text
                    }
                }
                mainWindow?.webContents.send('ai:chunk', fullText)
                break
            }

            if (response.stop_reason === 'tool_use') {
                // AI wants to use tools - process them
                const assistantContent: any[] = []
                const toolResults: any[] = []

                for (const block of response.content) {
                    if (block.type === 'text') {
                        fullText += block.text
                        assistantContent.push(block)
                    } else if (block.type === 'tool_use') {
                        assistantContent.push(block)

                        // Show tool usage to user (Running state)
                        const toolName = block.name as string
                        const toolInput = block.input as any
                        const toolStatusId = `status-${block.id}`

                        // Emit running status
                        const runningStatus = {
                            id: toolStatusId,
                            toolName,
                            path: toolInput?.path || '',
                            status: 'running',
                            message: 'Executing...'
                        }
                        fullText += `\n\n[TOOL_STATUS]${JSON.stringify(runningStatus)}[/TOOL_STATUS]\n\n`
                        mainWindow?.webContents.send('ai:chunk', fullText)

                        // Execute the tool
                        const result = await executeAITool(toolName, toolInput)

                        // Emit success status (we replace the previous one in the UI, but here we append)
                        // Note: In a real app we might want to replace the previous marker, 
                        // but since we're streaming text, we'll let the frontend handle the latest status for this ID.
                        // Actually, for simplicity in this MVP, let's just show the success state.
                        // The frontend will render the latest block it sees.

                        /* 
                           Better approach:
                           The 'running' block is already in fullText.
                           We can't "delete" from fullText easily without complicating the stream.
                           
                           However, our MessageList renders markdown. 
                           Pass: We will just emit the tool result. 
                           The 'running' status will remain as a record of what happened.
                           Wait - we want it to update from "Running" to "Success".
                           
                           If we use the SAME ID in the marker, maybe the frontend can verify?
                           For now, let's just show the result.
                           
                           Actually, if we want the "Running" pill to turn into "Success", 
                           React needs to track it.
                           
                           Verification:
                           For this MVP, let's just show the "Running" state via the marker. 
                           When the tool is done, we usually show the output (DiffBlock or text).
                           
                           Let's update the marker to 'success' AFTER execution if it's not a DiffBlock. 
                        */

                        // For now, let's just mark it as success immediately after execution? 
                        // No, let's keep it simple:
                        // 1. Emit [TOOL_STATUS]... (running)
                        // 2. Execute
                        // 3. Emit [TOOL_STATUS]... (success)

                        const successStatus = {
                            id: toolStatusId,
                            toolName,
                            path: toolInput?.path || '',
                            status: result.startsWith('Error') ? 'error' : 'success',
                            message: result.includes('[DIFF_BLOCK]') ? 'Edit proposed' : result.substring(0, 100)
                        }

                        // We append the success status. 
                        // The frontend MessageList will see TWO markers. 
                        // We can handle this in the frontend to deduplicate by ID.
                        fullText += `[TOOL_STATUS]${JSON.stringify(successStatus)}[/TOOL_STATUS]`
                        mainWindow?.webContents.send('ai:chunk', fullText)

                        // Check if result contains a DIFF_BLOCK marker
                        // If so, send the marker to frontend, but send simplified result to API
                        if (result.includes('[DIFF_BLOCK]')) {
                            // Add the full result with marker to frontend
                            fullText += result
                            mainWindow?.webContents.send('ai:chunk', fullText)

                            // Send simplified result to API so it knows the edit is pending approval
                            toolResults.push({
                                type: 'tool_result',
                                tool_use_id: block.id,
                                content: 'Edit proposed successfully. The user will review and accept/reject the changes.'
                            })
                        } else {
                            // Normal tool result
                            toolResults.push({
                                type: 'tool_result',
                                tool_use_id: block.id,
                                content: result
                            })
                        }
                    }
                }

                // Add assistant's message with tool calls
                apiMessages.push({
                    role: 'assistant',
                    content: assistantContent
                })

                // Add tool results
                apiMessages.push({
                    role: 'user',
                    content: toolResults
                })

                // Continue the loop to get final response
                continue
            }

            // Unknown stop reason - break
            break
        }

        return fullText
    } catch (error: any) {
        console.error('AI Service Error:', error)
        const msg = error.message || 'Unknown error occurred'
        throw new Error(`AI Error: ${msg}`)
    }
})

// ============================================
// FILE SYSTEM HANDLERS
// ============================================

interface FileNode {
    id: string
    name: string
    path: string
    isFolder: boolean
    children?: FileNode[]
}

// Persistent store for workspace path
const store = new Store()
// Resolve path on load to ensure consistency
const storedPath = store.get('lastWorkspace') as string | null
let workspacePath: string | null = storedPath ? resolve(storedPath) : null
let watcher: ReturnType<typeof chokidar.watch> | null = null

// Log startup state
console.log('[Main Process] Startup - workspacePath:', workspacePath)


// Start file system watcher
function startWatcher(folderPath: string) {
    watcher?.close()
    watcher = chokidar.watch(folderPath, {
        ignored: /(^|[\/\\])\../, // Ignore dotfiles
        persistent: true,
        ignoreInitial: true,
        depth: 10
    })

    watcher.on('all', (event: string, filePath: string) => {
        mainWindow?.webContents.send('fs:changed', { event, path: filePath })
    })
}

// Read directory and return FileNode array
async function readDirSafe(dirPath: string): Promise<FileNode[]> {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })
        return entries
            .filter(e => !e.name.startsWith('.')) // Hide dotfiles
            .map(e => ({
                id: join(dirPath, e.name),
                name: e.name,
                path: join(dirPath, e.name),
                isFolder: e.isDirectory()
            }))
            .sort((a, b) => {
                // Folders first, then alphabetical
                if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
                return a.name.localeCompare(b.name)
            })
    } catch (error) {
        console.error('Error reading directory:', error)
        return []
    }
}

// Security: Validate path is within workspace
function isWithinWorkspace(targetPath: string): boolean {
    if (!workspacePath) {
        console.log('[isWithinWorkspace] FAILED: workspacePath is null')
        return false
    }
    // Normalize BOTH paths using resolve() for consistent comparison
    const normalizedTarget = resolve(targetPath).toLowerCase().replace(/\\/g, '/')
    const normalizedWorkspace = resolve(workspacePath).toLowerCase().replace(/\\/g, '/')
    const isWithin = normalizedTarget.startsWith(normalizedWorkspace)

    if (!isWithin) {
        console.log('[isWithinWorkspace] FAILED:', {
            target: normalizedTarget,
            workspace: normalizedWorkspace
        })
    }
    return isWithin
}

// Open folder dialog
ipcMain.handle('fs:openFolder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    })

    if (result.canceled || !result.filePaths[0]) return null

    workspacePath = result.filePaths[0]
    store.set('lastWorkspace', workspacePath)
    startWatcher(workspacePath)

    const items = await readDirSafe(workspacePath)
    return { path: workspacePath, name: basename(workspacePath), items }
})

// Get last workspace (for restore on startup)
ipcMain.handle('fs:getLastWorkspace', async () => {
    if (!workspacePath) return null

    try {
        await fs.access(workspacePath)
        startWatcher(workspacePath)
        const items = await readDirSafe(workspacePath)
        return { path: workspacePath, name: basename(workspacePath), items }
    } catch {
        // Path no longer exists
        store.delete('lastWorkspace')
        workspacePath = null
        return null
    }
})

// Read directory contents
ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
    if (!isWithinWorkspace(dirPath)) {
        throw new Error('Access denied: path outside workspace')
    }
    return await readDirSafe(dirPath)
})

// Create file
ipcMain.handle('fs:createFile', async (_, parentPath: string, fileName: string) => {
    const filePath = join(parentPath, fileName)
    if (!isWithinWorkspace(filePath)) {
        throw new Error('Access denied')
    }

    await fs.writeFile(filePath, '', 'utf-8')
    return { id: filePath, name: fileName, path: filePath, isFolder: false }
})

// Create folder
ipcMain.handle('fs:createFolder', async (_, parentPath: string, folderName: string) => {
    const folderPath = join(parentPath, folderName)
    if (!isWithinWorkspace(folderPath)) {
        throw new Error('Access denied')
    }

    await fs.mkdir(folderPath, { recursive: true })
    return { id: folderPath, name: folderName, path: folderPath, isFolder: true }
})

// Rename file/folder
ipcMain.handle('fs:rename', async (_, oldPath: string, newName: string) => {
    if (!isWithinWorkspace(oldPath)) {
        throw new Error('Access denied')
    }

    const newPath = join(dirname(oldPath), newName)
    await fs.rename(oldPath, newPath)
    return { oldPath, newPath, name: newName }
})

// Delete file/folder
ipcMain.handle('fs:delete', async (_, targetPath: string) => {
    if (!isWithinWorkspace(targetPath)) {
        throw new Error('Access denied')
    }

    await fs.rm(targetPath, { recursive: true, force: true })
    return { path: targetPath }
})

// Move file/folder
ipcMain.handle('fs:move', async (_, sourcePath: string, destFolder: string) => {
    if (!isWithinWorkspace(sourcePath) || !isWithinWorkspace(destFolder)) {
        throw new Error('Access denied')
    }

    const fileName = basename(sourcePath)
    const destPath = join(destFolder, fileName)
    await fs.rename(sourcePath, destPath)
    return { oldPath: sourcePath, newPath: destPath }
})

// Read file content
ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    console.log('[fs:readFile] Request:', { filePath, workspacePath })

    if (!isWithinWorkspace(filePath)) {
        console.log('[fs:readFile] Access denied - path outside workspace')
        throw new Error('Access denied: path outside workspace')
    }

    // Check file size (10MB limit)
    const stats = await fs.stat(filePath)
    if (stats.size > 10 * 1024 * 1024) {
        throw new Error('File too large (>10MB). Please open smaller files.')
    }

    console.log('[fs:readFile] Reading file...')
    const content = await fs.readFile(filePath, 'utf-8')
    console.log('[fs:readFile] Success, content length:', content.length)
    console.log('[fs:readFile] Success, content length:', content.length)
    return content
})

// Write file content
ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    console.log('[fs:writeFile] Request:', { filePath })

    if (!isWithinWorkspace(filePath)) {
        throw new Error('Access denied: path outside workspace')
    }

    await fs.writeFile(filePath, content, 'utf-8')
    return true
})

import { TerminalService } from './terminal'

app.whenReady().then(() => {
    createWindow()

    // Initialize Terminal Service when window is created
    if (mainWindow) {
        new TerminalService(mainWindow)
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
