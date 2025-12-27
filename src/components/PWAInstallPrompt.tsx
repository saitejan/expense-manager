import { X, Download, Share, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallPrompt = () => {
    const { platform, showPrompt, handleInstall, handleDismiss } = usePWAInstall();

    if (!showPrompt) {
        return null;
    }

    // iOS-specific instructions
    if (platform === 'ios') {
        return (
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
                <div className="max-w-4xl mx-auto px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                            <Smartphone className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm mb-1">Install Money Track</p>
                                <p className="text-xs opacity-90 leading-relaxed">
                                    Tap <Share className="w-3 h-3 inline mx-0.5" /> (Share) below, then scroll and tap "Add to Home Screen"
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition"
                            aria-label="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Android/Desktop Chrome/Edge
    return (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
            <div className="max-w-4xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Download className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm mb-0.5">Install Money Track</p>
                            <p className="text-xs opacity-90">
                                Get the full app experience with offline access
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={handleInstall}
                            className="px-4 py-1.5 bg-white text-indigo-600 rounded-lg font-medium text-sm hover:bg-indigo-50 transition whitespace-nowrap"
                        >
                            Install
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="p-1.5 hover:bg-white/20 rounded transition"
                            aria-label="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
