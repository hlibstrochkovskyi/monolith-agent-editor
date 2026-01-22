import React, { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useWorkspaceStore } from '../../stores/workspaceStore'

export const TerminalPanel: React.FC = () => {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<Terminal | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)
    const { rootPath } = useWorkspaceStore()

    // Initialize Terminal
    useEffect(() => {
        if (!terminalRef.current) return

        // Create xterm instance
        const term = new Terminal({
            theme: {
                background: '#ffffff', // Light theme to match app
                foreground: '#09090b',
                cursor: '#52525b',
                selectionBackground: '#e4e4e7',
                black: '#000000',
                red: '#ef4444',
                green: '#22c55e',
                yellow: '#eab308',
                blue: '#3b82f6',
                magenta: '#d946ef',
                cyan: '#06b6d4',
                white: '#71717a',
                brightBlack: '#71717a',
                brightRed: '#f87171',
                brightGreen: '#4ade80',
                brightYellow: '#facc15',
                brightBlue: '#60a5fa',
                brightMagenta: '#e879f9',
                brightCyan: '#22d3ee',
                brightWhite: '#ffffff',
            },
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 13,
            lineHeight: 1.2,
            cursorBlink: true,
            allowProposedApi: true
        })

        const fitAddon = new FitAddon()
        term.loadAddon(fitAddon)

        term.open(terminalRef.current)
        fitAddon.fit()

        xtermRef.current = term
        fitAddonRef.current = fitAddon

        // Initialize PTY process
        window.electronAPI.terminal.create({ cwd: rootPath || undefined })

        // Handle user input
        const onDataDisposable = term.onData((data) => {
            window.electronAPI.terminal.write(data)
        })

        // Handle incoming data from PTY
        const unsubscribeIncoming = window.electronAPI.terminal.onIncoming((data) => {
            term.write(data)
        })

        // Cleanup
        return () => {
            onDataDisposable.dispose()
            unsubscribeIncoming()
            term.dispose()
        }
    }, []) // Run once on mount

    // Handle Resize
    useEffect(() => {
        if (!terminalRef.current || !fitAddonRef.current || !xtermRef.current) return

        const resizeObserver = new ResizeObserver(() => {
            // Debounce slightly or just run
            try {
                fitAddonRef.current?.fit()
                const dims = fitAddonRef.current?.proposeDimensions()
                if (dims) {
                    window.electronAPI.terminal.resize(dims.cols, dims.rows)
                }
            } catch (e) {
                console.error('Terminal resize error:', e)
            }
        })

        resizeObserver.observe(terminalRef.current)

        return () => resizeObserver.disconnect()
    }, [])

    return (
        <div className="h-full w-full bg-background pl-4 pt-2 overflow-hidden">
            <div ref={terminalRef} className="h-full w-full" />
        </div>
    )
}
