import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Download } from 'lucide-react'


// --- PWA Service Worker Registration Utility ---
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

const registerServiceWorker = (onUpdateAvailable: () => void) => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/expense-manager/service-worker.js')
        .then(registration => {
          console.log('[App] Service Worker registered:', registration);
          serviceWorkerRegistration = registration;

          // Check for updates periodically (every 60 seconds)
          // setInterval(() => {
          //   registration.update();
          // }, 60000);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[App] New service worker available');
                  onUpdateAvailable();
                }
              });
            }
          });
        })
        .catch(error => {
          console.error('[App] Service Worker registration failed:', error);
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          console.log('[App] Received UPDATE_AVAILABLE message');
          onUpdateAvailable();
        } else if (event.data && event.data.type === 'APP_UPDATED') {
          console.log('[App] App has been updated, reloading page');
        }
      });
    });
  }
};

// Function to trigger update
export const updateServiceWorker = () => {
  if (serviceWorkerRegistration && serviceWorkerRegistration.waiting) {
    // Send message to service worker to skip waiting
    serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Listen for controlling service worker change
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
};
// --- End Service Worker Utility ---


// Update Prompt Component
const UpdatePrompt = ({ onUpdate, onDismiss }: { onUpdate: () => void, onDismiss: () => void }) => {
  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-8 sm:bottom-8 sm:w-96 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-2xl p-4 border-2 border-white">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 bg-white rounded-full p-2">
            <Download className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-grow">
            <h3 className="font-bold text-lg mb-1">Update Available!</h3>
            <p className="text-sm text-indigo-100 mb-3">
              A new version of MoneyTrack is ready. Update now to get the latest features and improvements.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={onUpdate}
                className="flex-1 bg-white text-indigo-600 font-semibold py-2 px-4 rounded-lg hover:bg-indigo-50 transition duration-150"
              >
                Update Now
              </button>
              <button
                onClick={onDismiss}
                className="px-4 py-2 text-white hover:bg-white/20 rounded-lg transition duration-150"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Root App Wrapper with Update Detection
const RootApp = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    registerServiceWorker(() => {
      setUpdateAvailable(true);
    });
  }, []);

  const handleUpdate = () => {
    updateServiceWorker();
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  return (
    <>
      <App />
      {updateAvailable && <UpdatePrompt onUpdate={handleUpdate} onDismiss={handleDismiss} />}
    </>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)
