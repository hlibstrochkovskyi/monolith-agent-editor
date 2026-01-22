import * as pty from 'node-pty'
import { BrowserWindow, ipcMain, IpcMainEvent } from 'electron'
import * as os from 'os'

// Terminal Manager to handle multiple terminal sessions if needed
// For MVP we can start with one supported session
export class TerminalService {
    private ptyProcess: pty.IPty | null = null
    private window: BrowserWindow | null = null

    constructor(mainWindow: BrowserWindow) {
        this.window = mainWindow
        this.setupIpc()
    }

    private setupIpc() {
        ipcMain.handle('terminal:create', (_, options) => this.createTerminal(options))
        ipcMain.on('terminal:write', (_, data) => this.write(data))
        ipcMain.on('terminal:resize', (_, cols, rows) => this.resize(cols, rows))
        ipcMain.handle('terminal:dispose', () => this.dispose())
    }

    createTerminal(options: { cwd?: string } = {}) {
        if (this.ptyProcess) {
            this.ptyProcess.kill()
        }

        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash'

        // Use user's home directory or provided CWD
        const cwd = options.cwd || os.homedir()

        try {
            this.ptyProcess = pty.spawn(shell, [], {
                name: 'xterm-color',
                cols: 80,
                rows: 30,
                cwd,
                env: process.env as any
            })

            // Data FROM terminal TO frontend
            this.ptyProcess.onData((data) => {
                if (this.window && !this.window.isDestroyed()) {
                    this.window.webContents.send('terminal:incoming', data)
                }
            })

            console.log(`[Terminal] Spawned ${shell} in ${cwd}`)
            return true
        } catch (error) {
            console.error('[Terminal] Failed to spawn:', error)
            return false
        }
    }

    write(data: string) {
        if (this.ptyProcess) {
            this.ptyProcess.write(data)
        }
    }

    resize(cols: number, rows: number) {
        if (this.ptyProcess) {
            try {
                this.ptyProcess.resize(cols, rows)
            } catch (e) {
                // Resize can fail if process is dead
            }
        }
    }

    dispose() {
        if (this.ptyProcess) {
            this.ptyProcess.kill()
            this.ptyProcess = null
        }
    }
}
