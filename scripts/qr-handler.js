// Do It (Later) - QR Handler Module
// Handles QR code generation, scanning, and data import/export

class QRHandler {
  constructor(app) {
    this.app = app;
  }

  /**
   * Show QR modal with share/scan tabs
   * Creates a modal interface for sharing tasks via QR code or scanning QR codes
   */
  showModal() {
    let qrData;
    try {
      qrData = Sync.generateQRData(this.app.data);
    } catch (error) {
      console.error('QR generation failed:', error);
      this.app.showNotification(`QR generation failed: ${error.message}`, 'error');
      return;
    }
    const dataSize = qrData.length;
    const maxSize = 2950; // QR code practical limit with Low error correction (v5 delimiter format)
    const isTooBig = dataSize > maxSize;

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
      max-width: 90%;
      max-height: 90vh;
      overflow: auto;
      text-align: center;
      color: var(--text);
    `;

    content.innerHTML = `
      <button class="qr-close" id="close-modal" aria-label="Close modal">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
        </svg>
      </button>

      <h3 class="qr-modal-title">QR Sync</h3>

      <div class="qr-tabs">
        <button id="share-tab" class="qr-tab active">Share</button>
        <button id="scan-tab" class="qr-tab">Scan</button>
      </div>

      <!-- Share Panel -->
      <div id="share-panel" class="qr-panel">
        ${isTooBig ? `
          <div class="qr-error" style="padding: 2rem; text-align: center; color: var(--text);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h4 style="margin: 0 0 0.5rem 0;">Too Many Tasks for QR Code</h4>
            <p style="margin: 0 0 1rem 0; opacity: 0.8;">
              ${dataSize} bytes (max ${maxSize} bytes)<br>
              Try exporting to file or clipboard instead
            </p>
            <button onclick="document.getElementById('export-file-btn').click(); document.querySelector('.qr-close').click();"
                    style="padding: 0.5rem 1rem; background: var(--notebook-yellow); border: none; border-radius: 4px; cursor: pointer;">
              Export to File
            </button>
          </div>
        ` : `
          <div class="qr-container">
            <div id="qr-code" class="qr-code-display">
              <div class="qr-loading">Generating QR code...</div>
            </div>
          </div>
          <p class="qr-stats" style="margin-top: 1rem; opacity: 0.7;">
            ${(this.app.data.today || []).filter(t => !t.completed).length + (this.app.data.tomorrow || []).filter(t => !t.completed).length} tasks • ${dataSize} bytes
          </p>
        `}
      </div>

      <!-- Scan Panel -->
      <div id="scan-panel" class="qr-panel qr-panel-hidden">
        <div class="camera-controls">
          <button id="start-camera" class="sync-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M15 12V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586L9.828 2.828A2 2 0 0 0 8.414 2H7.586a2 2 0 0 0-1.414.586L5.586 3.172A2 2 0 0 1 4.172 4H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2zM8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
            </svg>
            Start Camera
          </button>
          <button id="stop-camera" class="sync-btn" style="display: none;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="12" height="12" rx="2"/>
            </svg>
            Stop Camera
          </button>
        </div>

        <div id="camera-area" class="camera-area" style="display: none;">
          <div class="camera-container">
            <video id="camera-preview" autoplay playsinline class="camera-preview"></video>
            <div class="scan-overlay">
              <div class="scan-corner scan-corner-tl"></div>
              <div class="scan-corner scan-corner-tr"></div>
              <div class="scan-corner scan-corner-bl"></div>
              <div class="scan-corner scan-corner-br"></div>
            </div>
          </div>
          <p id="scan-status" class="scan-status">
            Point camera at QR code and hold steady
          </p>
        </div>

        <div id="scan-result" class="scan-result" style="display: none;">
          <div class="scan-success">
            QR Code Detected
          </div>
          <p id="scan-data-preview" class="scan-preview"></p>
          <div class="scan-actions">
            <button id="import-scanned" class="sync-btn">Import Tasks</button>
            <button id="scan-again" class="sync-btn">Scan Again</button>
          </div>
        </div>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // QR tab styles are now handled in main.css

    // Generate QR code with multiple fallbacks (only if not too big)
    if (!isTooBig) {
      this.generateQRCode(qrData);
    }

    // Tab switching
    const shareTab = content.querySelector('#share-tab');
    const scanTab = content.querySelector('#scan-tab');
    const sharePanel = content.querySelector('#share-panel');
    const scanPanel = content.querySelector('#scan-panel');

    shareTab.addEventListener('click', () => {
      shareTab.classList.add('active');
      scanTab.classList.remove('active');
      sharePanel.classList.remove('qr-panel-hidden');
      scanPanel.classList.add('qr-panel-hidden');
    });

    scanTab.addEventListener('click', () => {
      scanTab.classList.add('active');
      shareTab.classList.remove('active');
      sharePanel.classList.add('qr-panel-hidden');
      scanPanel.classList.remove('qr-panel-hidden');
    });

    // Camera scanning functionality
    let currentScanner = null;
    let scannedData = null;

    const startCameraBtn = content.querySelector('#start-camera');
    const stopCameraBtn = content.querySelector('#stop-camera');
    const cameraArea = content.querySelector('#camera-area');
    const scanStatus = content.querySelector('#scan-status');
    const scanResult = content.querySelector('#scan-result');
    const importScannedBtn = content.querySelector('#import-scanned');
    const scanAgainBtn = content.querySelector('#scan-again');

    // Start camera scanning
    startCameraBtn.addEventListener('click', async () => {
      try {
        const video = content.querySelector('#camera-preview');
        currentScanner = new QRScanner();

        await currentScanner.init(
          video,
          (data) => {
            // QR code scanned successfully
            scannedData = data;
            this.handleScanSuccess(data, scanResult, scanStatus);
          },
          (error) => {
            scanStatus.textContent = `Error: ${error}`;
            scanStatus.style.color = 'var(--error-color, #ff6b6b)';
          }
        );

        currentScanner.startScanning();

        // Update UI
        cameraArea.style.display = 'block';
        startCameraBtn.style.display = 'none';
        stopCameraBtn.style.display = 'inline-flex';
        scanStatus.textContent = 'Scanning for QR codes...';
        scanStatus.style.color = 'var(--text-muted)';

      } catch (error) {
        console.error('Camera error:', error);
        scanStatus.textContent = `Camera access failed: ${error.message}`;
        scanStatus.style.color = 'var(--error-color, #ff6b6b)';
      }
    });

    // Stop camera scanning
    stopCameraBtn.addEventListener('click', () => {
      if (currentScanner) {
        currentScanner.stopScanning();
        currentScanner = null;
      }

      cameraArea.classList.add('camera-area-hidden');
      scanResult.style.display = 'none';
      startCameraBtn.style.display = 'inline-block';
      stopCameraBtn.style.display = 'none';
      scannedData = null;
    });

    // Import scanned data
    importScannedBtn.addEventListener('click', () => {
      if (!scannedData) {
        this.app.showNotification('No scanned data available', 'error');
        return;
      }

      this.importQRData(scannedData, modal, null);
    });

    // Scan again
    scanAgainBtn.addEventListener('click', () => {
      scanResult.style.display = 'none';
      scanStatus.textContent = 'Scanning for QR codes...';
      scanStatus.style.color = 'var(--text-muted)';
      scannedData = null;

      if (currentScanner) {
        currentScanner.startScanning();
      }
    });

    // Close modal handlers
    const closeModal = () => {
      // Cleanup camera if active
      if (currentScanner) {
        currentScanner.stopScanning();
      }
      document.body.removeChild(modal);
      // Remove inline styles if they were added
      const existingStyle = document.getElementById('qr-modal-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    content.querySelector('#close-modal').addEventListener('click', closeModal);
  }

  /**
   * Generate QR code with fallbacks
   * @param {string} data - Data to encode in QR code
   */
  generateQRCode(data) {
    const qrElement = document.getElementById('qr-code');
    if (!qrElement) {
      console.error('❌ QR element not found');
      return;
    }

    console.log(`📊 Generating QR code... (${data.length} bytes)`);

    // Method 1: Try local QRCode library
    setTimeout(() => {
      try {
        qrElement.innerHTML = '';

        if (typeof QRCode !== 'undefined') {
          console.log('✅ QRCode library loaded');

          const qr = new QRCode(qrElement, {
            text: data,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.L  // Low error correction for maximum capacity
          });

          // Clean up the QR code display - remove any extra elements and padding
          setTimeout(() => {
            const qrImg = qrElement.querySelector('img');
            const qrCanvas = qrElement.querySelector('canvas');
            const qrTable = qrElement.querySelector('table');

            if (!qrImg && !qrCanvas && !qrTable) {
              console.error('❌ QR code element not created');
              throw new Error('QR code generation failed - no output');
            }

            // Remove all existing content and styling
            qrElement.style.padding = '0';
            qrElement.style.margin = '0';
            qrElement.style.background = 'transparent';

            if (qrImg) {
              // Clean image-based QR codes
              console.log('✅ QR generated as image');
              qrElement.innerHTML = '';
              qrImg.style.cssText = 'display: block; margin: 0; padding: 0; width: 200px; height: 200px;';
              qrElement.appendChild(qrImg);
            } else if (qrCanvas) {
              // Clean canvas-based QR codes
              console.log('✅ QR generated as canvas');
              qrElement.innerHTML = '';
              qrCanvas.style.cssText = 'display: block; margin: 0; padding: 0; width: 200px; height: 200px;';
              qrElement.appendChild(qrCanvas);
            } else if (qrTable) {
              // Clean table-based QR codes (older browsers)
              console.log('✅ QR generated as table');
              qrElement.innerHTML = '';
              qrTable.style.cssText = 'margin: 0; padding: 0; border-collapse: collapse; width: 200px; height: 200px;';
              qrElement.appendChild(qrTable);
            }
          }, 100);

          return;
        }
        throw new Error('Local QRCode library not available');

      } catch (error) {
        console.error('❌ Local QR generation failed:', error.message);
        this.generateQRCodeFallback(data);
      }
    }, 100);
  }

  /**
   * Fallback QR code generation using online service
   * @param {string} data - Data to encode in QR code
   */
  generateQRCodeFallback(data) {
    const qrElement = document.getElementById('qr-code');
    if (!qrElement) return;

    // Method 2: Online QR service
    try {
      const encodedData = encodeURIComponent(data);
      const maxUrlLength = 2048; // URL length limit

      if (encodedData.length > maxUrlLength) {
        throw new Error('Data too large for online QR service');
      }

      const img = document.createElement('img');
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}`;
      img.style.cssText = 'width: 200px; height: 200px; border-radius: 4px;';
      img.onload = () => console.log('QR generated with online service');
      img.onerror = () => {
        qrElement.innerHTML = this.getManualQRFallback(data);
      };
      qrElement.innerHTML = '';
      qrElement.appendChild(img);

    } catch (error) {
      console.log('Online QR generation failed:', error.message);
      qrElement.innerHTML = this.getManualQRFallback(data);
    }
  }

  /**
   * Get manual copy fallback UI
   * @param {string} data - Data to copy manually
   * @returns {string} HTML string for manual copy interface
   */
  getManualQRFallback(data) {
    const div = document.createElement('div');
    div.style.cssText = 'width: 200px; height: 200px; background: #f8f9fa; border: 2px dashed #dee2e6; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 1rem; color: #666;';

    const title = document.createElement('div');
    title.textContent = '📋 Manual Copy';
    title.style.cssText = 'font-size: 0.9rem; margin-bottom: 0.5rem;';

    const button = document.createElement('button');
    button.textContent = 'Copy Data';
    button.style.cssText = 'padding: 0.5rem; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;';
    button.onclick = () => {
      navigator.clipboard.writeText(data).then(() => {
        alert('Copied to clipboard!');
      }).catch(() => {
        prompt('Copy this data:', data);
      });
    };

    const subtitle = document.createElement('div');
    subtitle.textContent = 'Click to copy sync data';
    subtitle.style.cssText = 'font-size: 0.7rem; margin-top: 0.5rem; opacity: 0.7;';

    div.appendChild(title);
    div.appendChild(button);
    div.appendChild(subtitle);

    return div.outerHTML;
  }

  /**
   * Handle successful QR scan
   * @param {string} data - Scanned QR data
   * @param {HTMLElement} scanResult - Scan result element
   * @param {HTMLElement} scanStatus - Scan status element
   */
  handleScanSuccess(data, scanResult, scanStatus) {
    try {
      // Validate the QR data
      const parsedData = Sync.parseQRData(data);
      const taskCount = parsedData.today.length + parsedData.tomorrow.length;

      // Show scan result
      scanResult.style.display = 'block';
      const preview = scanResult.querySelector('#scan-data-preview');
      preview.textContent = `Found ${taskCount} tasks to import (${parsedData.totalCompleted} completed lifetime)`;

      scanStatus.textContent = 'QR code scanned successfully!';
      scanStatus.style.color = 'var(--success-color)';

    } catch (error) {
      console.error('QR validation error:', error);
      scanStatus.textContent = `Invalid QR code: ${error.message}`;
      scanStatus.style.color = 'var(--error-color, #ff6b6b)';
    }
  }

  /**
   * Import QR data with confirmation
   * @param {string} qrData - QR data to import
   * @param {HTMLElement} modal - Modal element to close after import
   * @param {HTMLElement|null} style - Style element to clean up (optional)
   */
  importQRData(qrData, modal, style) {
    try {
      let importedData = Sync.parseQRData(qrData);

      // Migrate old format to new format if needed
      importedData = Storage.migrateData(importedData);

      const shouldReplace = confirm(
        'Replace your current tasks with scanned data?\n\n' +
        'Click OK to replace everything, or Cancel to merge with existing tasks.'
      );

      if (shouldReplace) {
        this.app.data = importedData;
      } else {
        // Merge: add imported tasks to existing ones (v3 format uses today/tomorrow arrays)
        const importedToday = importedData.today || [];
        const importedTomorrow = importedData.tomorrow || [];

        importedToday.forEach(task => {
          const isDuplicate = this.app.data.today.some(existing =>
            existing.text === task.text || existing.id === task.id
          );
          if (!isDuplicate) {
            this.app.data.today.push(task);
          }
        });

        importedTomorrow.forEach(task => {
          const isDuplicate = this.app.data.tomorrow.some(existing =>
            existing.text === task.text || existing.id === task.id
          );
          if (!isDuplicate) {
            this.app.data.tomorrow.push(task);
          }
        });

        this.app.data.totalCompleted = Math.max(this.app.data.totalCompleted, importedData.totalCompleted || 0);
      }

      // Rebuild trees and counts after importing new tasks
      this.app.taskManager.buildTreesFromFlatData();
      this.app.taskManager.initializeSubtaskCounts();

      this.app.save();
      this.app.render();

      const taskCount = (importedData.today || []).length + (importedData.tomorrow || []).length;
      this.app.showNotification(`Imported ${taskCount} tasks from QR scan`, 'success');

      // Close modal
      document.body.removeChild(modal);
      if (style) {
        document.head.removeChild(style);
      }

    } catch (error) {
      console.error('QR import error:', error);
      this.app.showNotification(`Invalid QR data: ${error.message}`, 'error');
    }
  }
}

// Freeze to prevent modifications
Object.freeze(QRHandler.prototype);
