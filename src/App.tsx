import React from 'react'
import { TitleBar } from './components/layout/TitleBar'
import { WorkspaceLayout } from './components/layout/WorkspaceLayout'
import { StatusBar } from './components/layout/StatusBar'

const App: React.FC = () => {
    return (
        <div className="flex flex-col h-screen w-screen bg-gray-50 overflow-hidden">
            {/* Custom Title Bar */}
            <TitleBar />

            {/* Main Workspace */}
            <div className="flex-1 overflow-hidden">
                <WorkspaceLayout />
            </div>

            {/* Status Bar */}
            <StatusBar />
        </div>
    )
}

export default App
