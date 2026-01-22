import React from 'react'
import { Files, FolderKanban, Mail, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ActivityView = 'explorer' | 'projects' | 'email' | 'settings'

interface ActivityBarProps {
    activeView: ActivityView
    onViewChange: (view: ActivityView) => void
}

interface ActivityItemProps {
    icon: React.ReactNode
    isActive: boolean
    onClick: () => void
    title: string
    disabled?: boolean
}

const ActivityItem: React.FC<ActivityItemProps> = ({
    icon,
    isActive,
    onClick,
    title,
    disabled
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
            "relative w-12 h-12 flex items-center justify-center transition-colors",
            isActive
                ? "text-primary before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary"
                : "text-muted-foreground hover:text-foreground",
            disabled && "opacity-40 cursor-not-allowed"
        )}
    >
        {icon}
    </button>
)

export const ActivityBar: React.FC<ActivityBarProps> = ({
    activeView,
    onViewChange
}) => {
    return (
        <div className="w-12 h-full flex flex-col bg-muted/30 border-r border-border">
            {/* Top icons */}
            <div className="flex flex-col">
                <ActivityItem
                    icon={<Files className="w-5 h-5" />}
                    isActive={activeView === 'explorer'}
                    onClick={() => onViewChange('explorer')}
                    title="Explorer"
                />
                <ActivityItem
                    icon={<FolderKanban className="w-5 h-5" />}
                    isActive={activeView === 'projects'}
                    onClick={() => onViewChange('projects')}
                    title="Projects (Coming Soon)"
                    disabled
                />
                <ActivityItem
                    icon={<Mail className="w-5 h-5" />}
                    isActive={activeView === 'email'}
                    onClick={() => onViewChange('email')}
                    title="Email (Coming Soon)"
                    disabled
                />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Bottom icons */}
            <div className="flex flex-col">
                <ActivityItem
                    icon={<Settings className="w-5 h-5" />}
                    isActive={activeView === 'settings'}
                    onClick={() => onViewChange('settings')}
                    title="Settings (Coming Soon)"
                    disabled
                />
            </div>
        </div>
    )
}
