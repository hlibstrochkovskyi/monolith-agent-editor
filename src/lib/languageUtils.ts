/**
 * Maps file extensions to Monaco Editor language identifiers
 */

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
    // JavaScript / TypeScript
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescriptreact',
    'mjs': 'javascript',
    'cjs': 'javascript',

    // Web
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'less': 'less',

    // Data formats
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'ini',

    // Markdown
    'md': 'markdown',
    'mdx': 'markdown',

    // Programming languages
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'kt': 'kotlin',
    'swift': 'swift',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',

    // Shell
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'ps1': 'powershell',

    // Config files
    'env': 'ini',
    'gitignore': 'ini',
    'dockerignore': 'ini',

    // SQL
    'sql': 'sql',
}

/**
 * Get Monaco language from file path
 */
export function getLanguageFromPath(filePath: string | null): string {
    if (!filePath) return 'plaintext'

    const fileName = filePath.split(/[\\/]/).pop() || ''
    const extension = fileName.split('.').pop()?.toLowerCase() || ''

    // Handle dotfiles like .gitignore, .env
    if (fileName.startsWith('.') && !extension) {
        const dotfileName = fileName.slice(1)
        return EXTENSION_TO_LANGUAGE[dotfileName] || 'plaintext'
    }

    return EXTENSION_TO_LANGUAGE[extension] || 'plaintext'
}

/**
 * Check if a file is likely binary (should not be opened in text editor)
 */
export function isBinaryFile(filePath: string): boolean {
    const binaryExtensions = [
        'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'svg',
        'mp3', 'mp4', 'wav', 'avi', 'mov', 'mkv',
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'zip', 'rar', '7z', 'tar', 'gz',
        'exe', 'dll', 'so', 'dylib',
        'woff', 'woff2', 'ttf', 'otf', 'eot'
    ]

    const extension = filePath.split('.').pop()?.toLowerCase() || ''
    return binaryExtensions.includes(extension)
}
