/**
 * Custom modal dialog utility for alerts and confirmations
 * Creates and manages modal dialogs using DOM manipulation
 */

/**
 * Displays a custom modal dialog with alert or confirmation mode
 * @param title - Modal title text
 * @param message - Modal message content (supports whitespace with pre-wrap)
 * @param isConfirm - If true, shows Cancel/Confirm buttons; if false, shows OK button
 * @param onConfirm - Callback function when Confirm button is clicked
 * @param onCancel - Callback function when Cancel button is clicked
 */
export const showModal = (
  title: string,
  message: string,
  isConfirm = false,
  onConfirm = () => {},
  onCancel = () => {}
) => {
  const removeModal = () => {
    const modal = document.getElementById('custom-alert-modal');
    if (modal) document.body.removeChild(modal);
  };

  removeModal();

  const modalDiv = document.createElement('div');
  modalDiv.id = 'custom-alert-modal';
  modalDiv.className = "fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4";
  modalDiv.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm transform transition-all">
            <h3 class="text-xl font-bold mb-3 text-indigo-700">${title}</h3>
            <p class="text-gray-700 mb-6 text-sm whitespace-pre-wrap">${message}</p>
            <div class="flex justify-end space-x-2">
              ${isConfirm ? `
                <button id="cancel-modal-btn" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-150">
                    Cancel
                </button>
                <button id="confirm-modal-btn" class="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition duration-150">
                    Confirm
                </button>
              ` : `
                <button id="close-modal-btn" class="w-full py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150">
                    OK
                </button>
              `}
            </div>
        </div>
    `;
  document.body.appendChild(modalDiv);

  // Event handling
  if (isConfirm) {
    document.getElementById('cancel-modal-btn')?.addEventListener('click', () => {
      onCancel();
      removeModal();
    });
    document.getElementById('confirm-modal-btn')?.addEventListener('click', () => {
      onConfirm();
      removeModal();
    });
  } else {
    document.getElementById('close-modal-btn')?.addEventListener('click', removeModal);
  }
};
