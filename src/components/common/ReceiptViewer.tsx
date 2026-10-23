/**
 * Full-screen receipt photo. Tap anywhere or the close button to dismiss.
 */

import React from 'react';
import { X } from 'lucide-react';

interface ReceiptViewerProps {
  url: string | null;
  onClose: () => void;
}

export const ReceiptViewer: React.FC<ReceiptViewerProps> = ({ url, onClose }) => {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Receipt">
      <button onClick={onClose} className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 p-2 text-white bg-black/40 rounded-full" aria-label="Close receipt">
        <X className="w-6 h-6" />
      </button>
      <img src={url} alt="Receipt" className="max-w-full max-h-full object-contain rounded-lg" />
    </div>
  );
};
