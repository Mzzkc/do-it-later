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

  // QR detection using jsQR library
  detectQRCode(imageData) {
    try {
      // Use jsQR library for real QR code detection
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert", // Don't invert colors for better performance
      });

      if (code && code.data) {
        // Validate that this looks like our task data format
        if (this.isValidTaskData(code.data)) {
          return code.data;
        } else {
          console.log('QR code found but not valid task data:', code.data);
        }
      }

      return null; // No valid QR code found in this frame

    } catch (error) {
      console.error('QR detection error:', error);
      return null;
    }
  }

  // Validate QR code contains task data
  isValidTaskData(data) {
    try {
      const parsed = JSON.parse(data);

      // Check if it has the expected task data structure
      return parsed &&
             typeof parsed === 'object' &&
             (Array.isArray(parsed.today) || Array.isArray(parsed.tomorrow) || typeof parsed.totalCompleted === 'number');

    } catch (error) {
      return false;
    }
  }
}