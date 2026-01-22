import React from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'
import { APP_NAME } from '../../constants'
import { Button } from '../ui/button'
import { MenuBar } from './MenuBar'

export const TitleBar: React.FC = () => {
    const handleMinimize = () => window.electronAPI?.minimize()
    const handleMaximize = () => window.electronAPI?.maximize()
    const handleClose = () => window.electronAPI?.close()

    return (
        <div
            className="titlebar-drag-region h-9 bg-background border-b border-border flex items-center justify-between px-3 select-none flex-shrink-0 title-bar"
            data-print-hide="true"
        >
            {/* App Logo & Title */}
            <div className="flex items-center gap-2 titlebar-no-drag mr-4">
                <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
                    <Copy size={11} className="text-primary-foreground" strokeWidth={2.5} />
                </div>
                <span className="text-xs font-medium text-foreground">{APP_NAME}</span>
            </div>

            {/* Menu Bar (Standard Window Menu) */}
            <div className="titlebar-no-drag flex items-center">
                <MenuBar />
            </div>

            {/* Spacer for dragging */}
            <div className="flex-1" />

            {/* Window Controls */}
            <div className="flex items-center titlebar-no-drag">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMinimize}
                    className="w-11 h-9 rounded-none hover:bg-muted text-muted-foreground"
                >
                    <Minus size={14} strokeWidth={1.5} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMaximize}
                    className="w-11 h-9 rounded-none hover:bg-muted text-muted-foreground"
                >
                    <Square size={11} strokeWidth={1.5} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="w-11 h-9 rounded-none hover:bg-destructive hover:text-destructive-foreground text-muted-foreground transition-colors"
                >
                    <X size={14} strokeWidth={1.5} />
                </Button>
            </div>
        </div>
    )
}
