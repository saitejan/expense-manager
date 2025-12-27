import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Platform = 'ios' | 'android' | 'windows' | 'mac' | 'other';

interface UsePWAInstallReturn {
    platform: Platform;
    isInstallable: boolean;
    isInstalled: boolean;
    isDismissed: boolean;
    showPrompt: boolean;
    handleInstall: () => Promise<void>;
    handleDismiss: () => void;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const usePWAInstall = (): UsePWAInstallReturn => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [platform, setPlatform] = useState<Platform>('other');
    const [isInstalled, setIsInstalled] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    // Detect platform
    useEffect(() => {
        const userAgent = navigator.userAgent.toLowerCase();
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        // Check if already installed
        if (isStandalone || (window.navigator as any).standalone === true) {
            setIsInstalled(true);
            return;
        }

        // Detect platform
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setPlatform('ios');
        } else if (/android/.test(userAgent)) {
            setPlatform('android');
        } else if (/windows/.test(userAgent)) {
            setPlatform('windows');
        } else if (/mac/.test(userAgent)) {
            setPlatform('mac');
        } else {
            setPlatform('other');
        }
    }, []);

    // Check if user has dismissed the prompt
    useEffect(() => {
        const dismissedData = localStorage.getItem(DISMISS_KEY);
        if (dismissedData) {
            try {
                const { timestamp } = JSON.parse(dismissedData);
                const now = Date.now();
                if (now - timestamp < DISMISS_DURATION) {
                    setIsDismissed(true);
                } else {
                    // Expired, remove from storage
                    localStorage.removeItem(DISMISS_KEY);
                }
            } catch (error) {
                console.error('Error parsing dismiss data:', error);
                localStorage.removeItem(DISMISS_KEY);
            }
        }
    }, []);

    // Listen for beforeinstallprompt event (Chrome, Edge, Samsung Internet)
    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if app was installed
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    // Handle install button click
    const handleInstall = useCallback(async () => {
        if (!deferredPrompt) {
            return;
        }

        try {
            await deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;

            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                setIsInstalled(true);
            } else {
                console.log('User dismissed the install prompt');
            }

            setDeferredPrompt(null);
        } catch (error) {
            console.error('Error during install prompt:', error);
        }
    }, [deferredPrompt]);

    // Handle dismiss button click
    const handleDismiss = useCallback(() => {
        const dismissData = {
            timestamp: Date.now(),
        };
        localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissData));
        setIsDismissed(true);
    }, []);

    // Determine if we should show the prompt
    const isInstallable = platform === 'ios' || !!deferredPrompt;
    const showPrompt = !isInstalled && !isDismissed && isInstallable;

    return {
        platform,
        isInstallable,
        isInstalled,
        isDismissed,
        showPrompt,
        handleInstall,
        handleDismiss,
    };
};
