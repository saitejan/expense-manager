/**
 * Authentication view for signing in or continuing with local storage
 */

import React from 'react';
import { Cloud, HardDrive } from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

interface AuthViewProps {
  loading: boolean;
  onSignInWithGoogle: () => void;
  onContinueLocal: () => void;
}

/**
 * Login screen with Google Sign-In and local mode options
 * @param loading - Whether authentication is in progress
 * @param onSignInWithGoogle - Callback to initiate Google Sign-In
 * @param onContinueLocal - Callback to continue with local storage
 */
export const AuthView: React.FC<AuthViewProps> = ({ loading, onSignInWithGoogle, onContinueLocal }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg text-center h-full min-h-[400px]">
      <Cloud className="w-12 h-12 mb-4 text-indigo-500" />
      <h1 className="text-2xl font-bold mb-2 text-gray-800">Welcome to Money Track</h1>
      <p className="text-gray-600 mb-6 text-sm">
        Track your expenses with cloud sync or local storage.
      </p>

      <div className="space-y-3 w-full">
        {loading ? (
          <button
            disabled
            className="flex items-center justify-center w-full px-6 py-3 text-sm font-semibold text-white bg-gray-500 rounded-lg disabled:opacity-70"
          >
            <LoadingSpinner size="md" className="mr-3 text-white" />
            Connecting...
          </button>
        ) : (
          <>
            <button
              onClick={onSignInWithGoogle}
              className="flex items-center justify-center w-full px-6 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition duration-150"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M44 24.896c0-1.636-.14-3.232-.408-4.792H24v9.063h11.136c-.476 2.376-1.764 4.412-3.552 5.864l7.668 5.928c4.544-4.204 7.156-10.372 7.156-17.064z" fill="#4285F4"/>
                <path d="M24 44c5.58 0 10.288-1.856 13.72-5.064l-7.668-5.928c-2.124 1.436-4.856 2.276-7.052 2.276-5.46 0-10.088-3.708-11.756-8.688H3.32l-.088 6.132c3.556 7.04 10.74 11.964 19.332 11.964z" fill="#34A853"/>
                <path d="M12.244 27.656c-.512-1.536-.796-3.176-.796-4.896s.284-3.36.796-4.896l-.048-6.056H3.32C1.652 16.036.796 19.956.796 24c0 4.044.856 7.964 2.524 11.096l8.92-6.056z" fill="#FBBC05"/>
                <path d="M24 15.312c2.964 0 5.612 1.056 7.708 2.972l6.572-6.572C33.84 5.956 29.324 4 24 4c-8.592 0-15.776 4.924-19.332 11.964l8.92 6.056C13.912 19.02 18.54 15.312 24 15.312z" fill="#EA4335"/>
              </svg>
              Sign In with Google (Cloud Sync)
            </button>
            <button
              onClick={onContinueLocal}
              className="flex items-center justify-center w-full px-6 py-3 text-sm font-semibold text-indigo-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-150"
            >
              <HardDrive className="w-5 h-5 mr-2" />
              Continue with Local Storage
            </button>
          </>
        )}
      </div>
    </div>
  );
};
