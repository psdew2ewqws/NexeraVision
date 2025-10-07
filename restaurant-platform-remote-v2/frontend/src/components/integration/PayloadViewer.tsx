import React, { useState } from 'react'
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'

interface PayloadViewerProps {
  payload: Record<string, any>
  title?: string
  maxHeight?: string
}

export const PayloadViewer: React.FC<PayloadViewerProps> = ({
  payload,
  title = 'Payload',
  maxHeight = 'max-h-96'
}) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <h4 className="text-sm font-medium text-gray-300">{title}</h4>
        <button
          onClick={copyToClipboard}
          className="flex items-center space-x-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          {copied ? (
            <>
              <CheckIcon className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className={`overflow-auto ${maxHeight} p-4`}>
        <pre className="text-xs text-gray-300 font-mono">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    </div>
  )
}
