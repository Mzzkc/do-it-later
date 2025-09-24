// Simple QR Scanner using jsQR
// Lightweight implementation for Do It (Later)

class QRScanner {
  constructor() {
    this.video = null;
    this.canvas = null;
    this.context = null;
    this.scanning = false;
    this.onScanSuccess = null;
    this.onError = null;
  }

  async init(videoElement, onScanSuccess, onError) {
    this.video = videoElement;
    this.onScanSuccess = onScanSuccess;
    this.onError = onError;

    // Create canvas for processing
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');

    try {
      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      this.video.srcObject = stream;
      this.video.setAttribute('playsinline', true);
      this.video.play();

      return new Promise((resolve) => {
        this.video.addEventListener('loadedmetadata', () => {
          this.canvas.width = this.video.videoWidth;
          this.canvas.height = this.video.videoHeight;
          resolve();
        });
      });

    } catch (error) {
      if (this.onError) this.onError(`Camera access failed: ${error.message}`);
      throw error;
    }
  }

  startScanning() {
    if (this.scanning) return;
    this.scanning = true;
    this.scan();
  }

  stopScanning() {
    this.scanning = false;
    if (this.video && this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(track => track.stop());
    }
  }

  scan() {
    if (!this.scanning || !this.video || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
      if (this.scanning) {
        requestAnimationFrame(() => this.scan());
      }
      return;
    }

    // Draw video frame to canvas
    this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);

    // Simple QR detection (basic pattern recognition)
    const qrData = this.detectQRCode(imageData);

    if (qrData) {
      this.scanning = false;
      if (this.onScanSuccess) this.onScanSuccess(qrData);
      return;
    }

    // Continue scanning
    requestAnimationFrame(() => this.scan());
  }

  // QR detection placeholder
  detectQRCode(imageData) {
    // Real QR detection would use jsQR or similar library here
    // For now, we disable automatic detection to prevent false positives

    // To test the import functionality, users can manually generate and scan real QR codes
    // or we can add a "Test Import" button for development

    return null;
  }
}

// Simplified QR detection that looks for our specific data pattern
function isValidQRData(text) {
  try {
    const data = JSON.parse(text);
    return data && typeof data === 'object' &&
           (data.t || data.l || data.tc !== undefined);
  } catch {
    return false;
  }
}