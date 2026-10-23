/**
 * Custom modal dialog utility for alerts and confirmations
 * Creates and manages modal dialogs using DOM manipulation
 */

/**
 * Displays a custom modal dialog with alert or confirmation mode.
 * Bottom sheet on phones, centred dialog from the sm breakpoint up.
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
  modalDiv.className = "fixed inset-0 bg-black/50 flex justify-center items-end sm:items-center z-50 sm:p-4";
  modalDiv.innerHTML = `
        <div role="dialog" aria-modal="true" class="bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-sm">
            <h3 class="text-xl font-bold mb-3 text-indigo-700"></h3>
            <p class="text-gray-700 mb-6 text-sm whitespace-pre-wrap"></p>
            <div class="flex gap-2">
              ${isConfirm ? `
                <button id="cancel-modal-btn" class="flex-1 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-150">
                    Cancel
                </button>
                <button id="confirm-modal-btn" class="flex-1 py-3 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition duration-150">
                    Confirm
                </button>
              ` : `
                <button id="close-modal-btn" class="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150">
                    OK
                </button>
              `}
            </div>
        </div>
    `;
  // textContent, not innerHTML: messages can contain descriptions that came from SMS or user input
  modalDiv.querySelector('h3')!.textContent = title;
  modalDiv.querySelector('p')!.textContent = message;
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
