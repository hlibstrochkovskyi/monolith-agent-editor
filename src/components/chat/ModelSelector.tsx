import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { AVAILABLE_MODELS } from '../../constants'

interface ModelSelectorProps {
    selectedModelId: string
    onSelect: (modelId: string) => void
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModelId, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const selectedModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId) || AVAILABLE_MODELS[0]

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
                <span className="truncate max-w-[100px]">{selectedModel.name}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 overflow-hidden">
                    <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100 mb-1">
                        Select Model
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {AVAILABLE_MODELS.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => {
                                    if (!model.isUnavailable) {
                                        onSelect(model.id)
                                        setIsOpen(false)
                                    }
                                }}
                                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors group ${model.isUnavailable ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-medium ${model.id === selectedModelId ? 'text-primary' : 'text-foreground'}`}>
                                            {model.name}
                                        </span>
                                        {model.isUnavailable && (
                                            <span className="px-1.5 py-0.5 text-[9px] font-medium bg-red-100/50 text-red-500 rounded border border-red-100">
                                                UNAVAILABLE
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                        {model.provider}
                                    </span>
                                </div>
                                {model.id === selectedModelId && <Check size={14} className="text-primary" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
