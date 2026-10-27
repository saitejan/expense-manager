/**
 * Saving and opening files from the browser
 */

/**
 * Saves a file through the share sheet when the device has one (iOS home-screen apps
 * handle downloads poorly; the sheet saves to Files/iCloud or sends anywhere),
 * otherwise through a download link.
 * @returns false if the user dismissed the share sheet
 */
export const saveFile = async (file: File): Promise<boolean> => {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return true;
    } catch (error) {
      if ((error as Error).name === 'AbortError') return false;
      throw error;
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
};

/**
 * Opens the file picker and reads the chosen file as text
 * @param accept - File types the picker offers, e.g. '.csv'
 */
export const pickTextFile = (accept: string, onText: (text: string) => void, onError: () => void) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) file.text().then(onText, onError);
  };
  input.click();
};
