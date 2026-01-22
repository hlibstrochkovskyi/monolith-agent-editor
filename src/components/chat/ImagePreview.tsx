import React from 'react'
import { X } from 'lucide-react'

interface ImagePreviewProps {
    images: string[]
    onRemove: (index: number) => void
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ images, onRemove }) => {
    if (images.length === 0) return null

    return (
        <div className="flex items-center gap-2 px-3 pt-3 pb-1 overflow-x-auto">
            {images.map((img, index) => (
                <div key={index} className="relative group flex-shrink-0">
                    <div className="w-16 h-16 rounded-md overflow-hidden border border-border bg-muted">
                        <img
                            src={img}
                            alt={`Preview ${index}`}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <button
                        onClick={() => onRemove(index)}
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-background border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X size={10} />
                    </button>
                </div>
            ))}
        </div>
    )
}
