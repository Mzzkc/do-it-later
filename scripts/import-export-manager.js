// Do It (Later) - Import/Export Manager Module
// Handles all import and export functionality (file, clipboard, QR)

/**
 * ImportExportManager class - Manages data import/export operations
 * Handles:
 * - Export to file
 * - Export to clipboard
 * - Import from file
 * - Import from clipboard (with paste dialog fallback)
 * - QR code integration
 */
class ImportExportManager {
  /**
   * Creates a new ImportExportManager instance
   * @param {DoItTomorrowApp} app - Reference to the main application instance
   */
  constructor(app) {
    this.app = app;
  }

  /**
   * Setup all sync controls and event listeners
   * Called once during app initialization
   */
  setup() {
    const exportFileBtn = document.getElementById('export-file-btn');
    const exportClipboardBtn = document.getElementById('export-clipboard-btn');
    const importFile = document.getElementById('import-file');
    const importClipboardBtn = document.getElementById('import-clipboard-btn');
    const qrBtn = document.getElementById('qr-btn');

    // Export to file functionality
    exportFileBtn.addEventListener('click', () => {
      try {
        const filename = Sync.exportToFile(this.app.data);
        this.app.showNotification(`Exported to ${filename}`, 'success');
      } catch (error) {
        this.app.showNotification(`Export failed: ${error.message}`, 'error');
      }
    });

    // Export to clipboard functionality
    exportClipboardBtn.addEventListener('click', async () => {
      try {
        const textData = Sync.exportToText(this.app.data);
        await navigator.clipboard.writeText(textData);
        this.app.showNotification(`Copied to clipboard`, 'success');
      } catch (error) {
        this.app.showNotification(`Copy failed: ${error.message}`, 'error');
      }
    });

    // Import functionality
    importFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        let importedData = await Sync.importFromFile(file);

        // Migrate old format to new format if needed
        importedData = Storage.migrateData(importedData);

        // Merge with existing data
        const shouldReplace = confirm(
          'Replace your current tasks with imported data?\n\n' +
          'Click OK to replace everything, or Cancel to merge with existing tasks.'
        );

        if (shouldReplace) {
          this.app.data = importedData;
        } else {
          // Merge: add imported tasks to existing ones (avoid duplicates)
          const importedTasks = importedData.tasks || [];
          importedTasks.forEach(task => {
            const isDuplicate = this.app.data.tasks.some(existing =>
              existing.text === task.text && existing.list === task.list
            );
            if (!isDuplicate) {
              this.app.data.tasks.push(task);
            }
          });
          this.app.data.totalCompleted = Math.max(this.app.data.totalCompleted, importedData.totalCompleted || 0);
        }

        this.app.save();
        this.app.render();

        const taskCount = importedData.tasks ? importedData.tasks.length : 0;
        this.app.showNotification(`Imported ${taskCount} tasks`, 'success');

        // Clear file input
        importFile.value = '';
      } catch (error) {
        this.app.showNotification(`Import failed: ${error.message}`, 'error');
        importFile.value = '';
      }
    });

    // Import from clipboard functionality
    importClipboardBtn.addEventListener('click', async () => {
      try {
        // Try to read from clipboard first
        let clipboardText = '';

        // Check if we're on mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
          // On mobile, try clipboard API first
          try {
            clipboardText = await navigator.clipboard.readText();
          } catch (clipboardError) {
            // If it fails on mobile, show paste dialog
            console.log('Mobile clipboard access failed, showing paste dialog');
            clipboardText = await this.showPasteDialog();
            if (!clipboardText) {
              return; // User cancelled
            }
          }
        } else {
          // On desktop, always use paste dialog to avoid permission prompts
          clipboardText = await this.showPasteDialog();
          if (!clipboardText) {
            return; // User cancelled
          }
        }

        if (!clipboardText.trim()) {
          this.app.showNotification('Clipboard is empty or no data pasted', 'error');
          return;
        }

        // Try to parse as exported text format first
        let importedData;
        try {
          importedData = Sync.parseFromText(clipboardText);
        } catch (textError) {
          // If text parsing fails, try QR format
          try {
            importedData = Sync.parseQRData(clipboardText);
          } catch (qrError) {
            throw new Error('Invalid data format - not exported text or QR data');
          }
        }

        // Migrate old format to new format if needed
        importedData = Storage.migrateData(importedData);

        // Merge with existing data
        const shouldReplace = confirm(
          'Replace your current tasks with clipboard data?\n\n' +
          'Click OK to replace everything, or Cancel to merge with existing tasks.'
        );

        if (shouldReplace) {
          this.app.data = importedData;
        } else {
          // Merge: add imported tasks to existing ones (avoid duplicates)
          const importedTasks = importedData.tasks || [];
          importedTasks.forEach(task => {
            const isDuplicate = this.app.data.tasks.some(existing =>
              existing.text === task.text && existing.list === task.list
            );
            if (!isDuplicate) {
              this.app.data.tasks.push(task);
            }
          });
          this.app.data.totalCompleted = Math.max(this.app.data.totalCompleted, importedData.totalCompleted || 0);
        }

        this.app.save();
        this.app.render();

        const taskCount = importedData.tasks ? importedData.tasks.length : 0;
        this.app.showNotification(`Imported ${taskCount} tasks from clipboard`, 'success');

      } catch (error) {
        console.error('Clipboard import error:', error);

        // Provide specific error messages based on the error type
        if (error.name === 'NotAllowedError') {
          this.app.showNotification('Clipboard access denied. Please allow clipboard permissions and try again.', 'error');
        } else if (error.name === 'SecurityError') {
          this.app.showNotification('Clipboard access blocked for security. Make sure you are on HTTPS or localhost.', 'error');
        } else if (error.message.includes('Clipboard API')) {
          this.app.showNotification(error.message, 'error');
        } else {
          this.app.showNotification(`Import failed: ${error.message}`, 'error');
        }
      }
    });

    // QR Code functionality
    qrBtn.addEventListener('click', () => {
      this.app.qrHandler.showModal();
    });
  }

  /**
   * Show paste dialog for manual clipboard data entry
   * Used as a fallback when clipboard API is not available or blocked
   * @returns {Promise<string|null>} Promise that resolves with pasted text or null if cancelled
   */
  showPasteDialog() {
    return new Promise((resolve) => {
      // Create modal
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      `;

      const content = document.createElement('div');
      content.style.cssText = `
        background: var(--surface);
        padding: 2rem;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        text-align: center;
        color: var(--text);
      `;

      content.innerHTML = `
        <h3 style="margin-top: 0;">Paste Your Tasks</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          Press Ctrl+V (or Cmd+V on Mac) to paste your tasks data
        </p>
        <textarea
          id="paste-area"
          placeholder="Click here and press Ctrl+V to paste..."
          style="
            width: 100%;
            min-height: 200px;
            padding: 1rem;
            border: 1px solid var(--border);
            border-radius: 4px;
            background: var(--background);
            color: var(--text);
            font-family: inherit;
            resize: vertical;
            margin: 1rem 0;
          "
        ></textarea>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button id="paste-import" class="sync-btn" style="padding: 0.5rem 1.5rem;">Import</button>
          <button id="paste-cancel" class="sync-btn" style="padding: 0.5rem 1.5rem; opacity: 0.7;">Cancel</button>
        </div>
      `;

      modal.appendChild(content);
      document.body.appendChild(modal);

      // Auto-focus textarea
      const textarea = content.querySelector('#paste-area');
      setTimeout(() => textarea.focus(), 100);

      // Handle import
      content.querySelector('#paste-import').addEventListener('click', () => {
        const pastedText = textarea.value;
        document.body.removeChild(modal);
        resolve(pastedText);
      });

      // Handle cancel
      content.querySelector('#paste-cancel').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(null);
      });

      // Close on outside click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve(null);
        }
      });

      // Handle Enter key to import
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          const pastedText = textarea.value;
          document.body.removeChild(modal);
          resolve(pastedText);
        }
      });
    });
  }
}

// Freeze the prototype to prevent modifications
Object.freeze(ImportExportManager.prototype);
