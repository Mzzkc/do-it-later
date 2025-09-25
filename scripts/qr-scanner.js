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
    this.frameCount = 0; // For throttled logging
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
    console.log('QR Scanner: Starting scan process');
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
        // Log video state issues
        if (!this.video) {
          console.log('QR Scanner: No video element');
        } else if (this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
          console.log('QR Scanner: Video not ready, readyState:', this.video.readyState);
        }
        requestAnimationFrame(() => this.scan());
      }
      return;
    }

    // Draw video frame to canvas
    this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);

    // Log every 60 frames (about once per second)
    this.frameCount++;
    if (this.frameCount % 60 === 0) {
      console.log('QR Scanner: Processing frames...', this.canvas.width + 'x' + this.canvas.height, 'frame', this.frameCount);
    }

    // Simple QR detection (basic pattern recognition)
    const qrData = this.detectQRCode(imageData);

    if (qrData) {
      console.log('QR Scanner: Successfully detected QR code');
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
      // Check if jsQR library is loaded
      if (typeof jsQR === 'undefined') {
        console.error('jsQR library not loaded! QR scanning will not work.');
        if (this.onError) {
          this.onError('QR scanner library not loaded. Please check your internet connection and refresh.');
        }
        this.stopScanning();
        return null;
      }

      // Use jsQR library for real QR code detection
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert", // Don't invert colors for better performance
      });

      if (code && code.data) {
        console.log('QR code detected:', code.data);
        // Validate that this looks like our task data format
        if (this.isValidTaskData(code.data)) {
          return code.data;
        } else {
          console.log('QR code found but not valid task data format');
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
    console.log('Validating QR data:', data);

    // Check new ultra-compressed format first: T:task1|task2~L:task3~C:5
    if (data.includes('T:') || data.includes('L:') || data.includes('C:')) {
      const parts = data.split('~');
      const validParts = parts.filter(part =>
        part.startsWith('T:') || part.startsWith('L:') || part.startsWith('C:')
      );

      const isValid = validParts.length > 0;
      if (isValid) {
        console.log('Valid ultra-compressed task data format detected!');
      } else {
        console.log('Invalid ultra-compressed format');
      }
      return isValid;
    }

    // Fallback: Check legacy JSON formats
    try {
      const parsed = JSON.parse(data);
      console.log('Parsed QR data:', parsed);

      // Check if it has the expected compressed task data structure
      const isValid = parsed &&
             typeof parsed === 'object' &&
             (Array.isArray(parsed.t) || Array.isArray(parsed.l) || typeof parsed.tc === 'number' || typeof parsed.c === 'number');

      if (!isValid) {
        console.log('Invalid task data structure. Expected compressed format or ultra-compressed format');
      } else {
        console.log('Valid legacy JSON task data format detected!');
      }

      return isValid;

    } catch (error) {
      console.log('Failed to parse QR data as JSON and not ultra-compressed format:', error.message);
      return false;
    }
  }
}