import React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import {
    FilePlus,
    FolderPlus,
    FolderOpen,
    Save,
    Settings,
    HelpCircle,
    Command,
    Copy,
    Scissors,
    Clipboard,
    Undo,
    Redo,
    Terminal,
    Layout,
    Play
} from 'lucide-react'

export const MenuBar: React.FC = () => {
    const {
        openFolder,
        saveActiveFile,
        activeFileId,
        startCreateFile,
        startCreateFolder,
        rootPath,
        toggleTerminal
    } = useWorkspaceStore()

    // Handlers
    const handleNewFile = () => rootPath && startCreateFile(rootPath)
    const handleNewFolder = () => rootPath && startCreateFolder(rootPath)
    const handleSave = () => activeFileId && saveActiveFile()
    const handleOpenFolder = () => openFolder()
    const handleExit = () => window.electronAPI?.close()
    const handleToggleTerminal = () => toggleTerminal()

    // Common menu item styles
    const itemClass = "group text-xs leading-none text-foreground rounded-[3px] flex items-center h-[25px] px-[5px] relative select-none outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground cursor-default"
    const shortcutClass = "ml-auto pl-[20px] text-[9px] text-muted-foreground group-data-[highlighted]:text-accent-foreground"
    const contentClass = "min-w-[220px] bg-popover rounded-md p-[5px] shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[opacity,transform] data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade border border-border z-50"

    const MenuTrigger: React.FC<{ label: string }> = ({ label }) => (
        <DropdownMenu.Trigger asChild>
            <button className="px-2.5 py-1 text-xs hover:bg-accent hover:text-accent-foreground rounded-sm outline-none focus:bg-accent focus:text-accent-foreground transition-colors">
                {label}
            </button>
        </DropdownMenu.Trigger>
    )

    return (
        <div className="flex items-center ml-2 space-x-0.5">
            {/* FILE MENU */}
            <DropdownMenu.Root>
                <MenuTrigger label="File" />
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={contentClass} align="start" sideOffset={5}>
                        <DropdownMenu.Item className={itemClass} onSelect={handleNewFile}>
                            <FilePlus className="w-3.5 h-3.5 mr-2" />
                            New File <div className={shortcutClass}>Ctrl+N</div>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className={itemClass} onSelect={handleNewFolder}>
                            <FolderPlus className="w-3.5 h-3.5 mr-2" />
                            New Folder
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="h-[1px] bg-border m-[5px]" />
                        <DropdownMenu.Item className={itemClass} onSelect={handleOpenFolder}>
                            <FolderOpen className="w-3.5 h-3.5 mr-2" />
                            Open Folder... <div className={shortcutClass}>Ctrl+O</div>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className={itemClass} onSelect={handleSave} disabled={!activeFileId}>
                            <Save className="w-3.5 h-3.5 mr-2" />
                            Save <div className={shortcutClass}>Ctrl+S</div>
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="h-[1px] bg-border m-[5px]" />
                        <DropdownMenu.Item className={itemClass} onSelect={handleExit}>
                            Exit
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* EDIT MENU */}
            <DropdownMenu.Root>
                <MenuTrigger label="Edit" />
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={contentClass} align="start" sideOffset={5}>
                        <DropdownMenu.Item className={itemClass} disabled>
                            <Undo className="w-3.5 h-3.5 mr-2" />
                            Undo <div className={shortcutClass}>Ctrl+Z</div>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className={itemClass} disabled>
                            <Redo className="w-3.5 h-3.5 mr-2" />
                            Redo <div className={shortcutClass}>Ctrl+Y</div>
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="h-[1px] bg-border m-[5px]" />
                        <DropdownMenu.Item className={itemClass}>
                            <Scissors className="w-3.5 h-3.5 mr-2" />
                            Cut <div className={shortcutClass}>Ctrl+X</div>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className={itemClass}>
                            <Copy className="w-3.5 h-3.5 mr-2" />
                            Copy <div className={shortcutClass}>Ctrl+C</div>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className={itemClass}>
                            <Clipboard className="w-3.5 h-3.5 mr-2" />
                            Paste <div className={shortcutClass}>Ctrl+V</div>
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* VIEW MENU */}
            <DropdownMenu.Root>
                <MenuTrigger label="View" />
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={contentClass} align="start" sideOffset={5}>
                        <DropdownMenu.Item className={itemClass}>
                            <Command className="w-3.5 h-3.5 mr-2" />
                            Command Palette... <div className={shortcutClass}>Ctrl+P</div>
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="h-[1px] bg-border m-[5px]" />
                        <DropdownMenu.Item className={itemClass}>
                            <Layout className="w-3.5 h-3.5 mr-2" />
                            Explorer
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className={itemClass} onSelect={handleToggleTerminal}>
                            <Terminal className="w-3.5 h-3.5 mr-2" />
                            Terminal
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* HELP MENU */}
            <DropdownMenu.Root>
                <MenuTrigger label="Help" />
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={contentClass} align="start" sideOffset={5}>
                        <DropdownMenu.Item className={itemClass}>
                            <HelpCircle className="w-3.5 h-3.5 mr-2" />
                            About
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </div>
    )
}
