import React, { useState, useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { FileExplorer } from '../explorer/FileExplorer'
import { ChatPanel } from '../chat/ChatPanel'
import { ActivityBar, ActivityView } from './ActivityBar'
import { TerminalPanel } from '../terminal/TerminalPanel'
import { CodeEditor } from '../editor/CodeEditor'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { FolderKanban, Mail, FileCode } from 'lucide-react'
import { TabBar } from './TabBar'

// Placeholder panel for upcoming features
const PlaceholderPanel: React.FC<{ title: string; icon: React.ReactNode }> = ({ title, icon }) => (
    <div className="h-full flex flex-col bg-background">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            {icon}
            <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Coming soon...</p>
        </div>
    </div>
)

// Empty state when no file is open
const EmptyEditorState: React.FC = () => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-background text-muted-foreground">
        <FileCode className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm">Select a file to view</p>
        <p className="text-xs mt-1 opacity-60">Double-click any file in the explorer</p>
    </div>
)

export const WorkspaceLayout: React.FC = () => {
    const [activeView, setActiveView] = useState<ActivityView>('explorer')
    const {
        activeFileId,
        openFiles,
        fileContents,
        isFileLoading,
        fileError,
        updateActiveFileContent,
        saveActiveFile,
        unsavedFiles,
        openFile,
        closeFile,
        isTerminalOpen // New
    } = useWorkspaceStore()

    // Derived content
    const activeFileContent = activeFileId ? fileContents[activeFileId] ?? null : null

    // Helper to select tab
    const handleTabSelect = (path: string) => {
        openFile(path) // This will just activate it if already open
    }

    // Handle standard save shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault()
                saveActiveFile()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [saveActiveFile])

    // Render the active side panel based on selected view
    const renderSidePanel = () => {
        switch (activeView) {
            case 'explorer':
                return <FileExplorer />
            case 'projects':
                return <PlaceholderPanel title="Projects" icon={<FolderKanban className="w-4 h-4 text-muted-foreground" />} />
            case 'email':
                return <PlaceholderPanel title="Email" icon={<Mail className="w-4 h-4 text-muted-foreground" />} />
            default:
                return <FileExplorer />
        }
    }

    // Get file name for title (fallback if needed, though tabs handle this)
    const fileName = activeFileId?.split(/[\\/]/).pop() || null

    return (
        <div className="h-full flex">
            {/* Activity Bar - Fixed width */}
            <ActivityBar activeView={activeView} onViewChange={setActiveView} />

            {/* Main Content Area */}
            <PanelGroup direction="horizontal" className="flex-1">
                {/* Side Panel - Left */}
                <Panel defaultSize={25} minSize={15} maxSize={40}>
                    {renderSidePanel()}
                </Panel>

                {/* Resize Handle */}
                <PanelResizeHandle className="w-[2px] bg-border hover:bg-primary/50 transition-colors duration-150 cursor-col-resize active:bg-primary" />

                {/* Main Content - Code Editor & Terminal */}
                <Panel defaultSize={45} minSize={20}>
                    <PanelGroup direction="vertical">
                        <Panel defaultSize={isTerminalOpen ? 70 : 100} minSize={20}>
                            <div className="h-full flex flex-col bg-background min-w-0 overflow-hidden">
                                {/* Tab Bar replaces simple header */}
                                <TabBar
                                    openFiles={openFiles}
                                    activeFileId={activeFileId}
                                    unsavedFiles={unsavedFiles}
                                    onSelect={handleTabSelect}
                                    onClose={closeFile}
                                />

                                {/* Editor Content */}
                                <div className="flex-1 min-w-0 min-h-0 relative">
                                    {fileError ? (
                                        <div className="h-full w-full flex flex-col items-center justify-center bg-background text-destructive p-4 text-center">
                                            <FileCode className="w-12 h-12 mb-4 opacity-20" />
                                            <p className="font-medium">Unable to open file</p>
                                            <p className="text-sm mt-1 opacity-80">{fileError}</p>
                                        </div>
                                    ) : activeFileId ? (
                                        <CodeEditor
                                            value={activeFileContent ?? ''}
                                            filePath={activeFileId}
                                            isLoading={isFileLoading && !activeFileContent}
                                            onChange={(val) => val !== undefined && updateActiveFileContent(val)}
                                        />
                                    ) : (
                                        <EmptyEditorState />
                                    )}
                                </div>
                            </div>
                        </Panel>

                        {isTerminalOpen && (
                            <>
                                <PanelResizeHandle className="h-[2px] bg-border hover:bg-primary/50 transition-colors duration-150 cursor-row-resize active:bg-primary" />
                                <Panel defaultSize={30} minSize={10}>
                                    <TerminalPanel />
                                </Panel>
                            </>
                        )}
                    </PanelGroup>
                </Panel>

                {/* Resize Handle */}
                <PanelResizeHandle className="w-[2px] bg-border hover:bg-primary/50 transition-colors duration-150 cursor-col-resize active:bg-primary" />

                {/* Chat Panel - Right */}
                <Panel defaultSize={30} minSize={20} maxSize={50}>
                    <ChatPanel />
                </Panel>
            </PanelGroup>
        </div>
    )
}
