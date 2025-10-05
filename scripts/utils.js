// Do It (Later) - Utility Functions
// Shared utility functions used across the application

const Utils = {
  /**
   * Generate a unique ID for tasks
   * Uses timestamp + random string for uniqueness
   * @returns {string} Unique identifier
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * Escape HTML to prevent XSS attacks
   * @param {string} text - Text to escape
   * @returns {string} Escaped HTML-safe text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Format a date to a human-readable string
   * @param {Date} date - Date to format
   * @param {Object} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date string
   */
  formatDate(date, options = Config.DATE_FORMAT_OPTIONS) {
    return date.toLocaleDateString('en-US', options);
  },

  /**
   * Get today's date as ISO string (YYYY-MM-DD)
   * @returns {string} Today's date in ISO format
   */
  getTodayISO() {
    return new Date().toISOString().split('T')[0];
  },

  /**
   * Check if user is on mobile device
   * @returns {boolean} True if mobile device detected
   */
  isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  },

  /**
   * Debounce a function call
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Deep clone an object using JSON
   * Note: Does not handle functions, dates, or circular references
   * @param {Object} obj - Object to clone
   * @returns {Object} Cloned object
   */
  deepClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.error('Deep clone failed:', error);
      return obj;
    }
  },

  /**
   * Check if a value is empty (null, undefined, empty string, or empty array)
   * @param {*} value - Value to check
   * @returns {boolean} True if value is empty
   */
  isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },

  /**
   * Clamp a number between min and max values
   * @param {number} num - Number to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Clamped value
   */
  clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  },

  /**
   * Calculate distance between two points
   * @param {number} x1 - First point X coordinate
   * @param {number} y1 - First point Y coordinate
   * @param {number} x2 - Second point X coordinate
   * @param {number} y2 - Second point Y coordinate
   * @returns {number} Distance in pixels
   */
  distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Get a query parameter from the URL
   * @param {string} param - Parameter name
   * @returns {string|null} Parameter value or null
   */
  getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  },

  /**
   * Clean text by removing specific characters
   * @param {string} text - Text to clean
   * @param {string|RegExp} pattern - Characters/pattern to remove
   * @returns {string} Cleaned text
   */
  cleanText(text, pattern) {
    return text.replace(pattern, '');
  },

  /**
   * Truncate text to a maximum length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @param {string} suffix - Suffix to add (default: '...')
   * @returns {string} Truncated text
   */
  truncate(text, maxLength, suffix = '...') {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  },

  /**
   * Wait for a specified number of milliseconds
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise} Promise that resolves after delay
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Safely parse JSON with error handling
   * @param {string} jsonString - JSON string to parse
   * @param {*} defaultValue - Default value if parsing fails
   * @returns {*} Parsed value or default
   */
  safeJsonParse(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('JSON parse failed:', error);
      return defaultValue;
    }
  },

  /**
   * Safely stringify an object with error handling
   * @param {*} value - Value to stringify
   * @param {string} defaultValue - Default value if stringify fails
   * @returns {string} Stringified value or default
   */
  safeJsonStringify(value, defaultValue = '{}') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.error('JSON stringify failed:', error);
      return defaultValue;
    }
  }
};

// Freeze to prevent modifications
Object.freeze(Utils);
