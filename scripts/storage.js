// Do It (Later) - Storage Utilities
// Handles all localStorage operations with error handling

const Storage = {
  /**
   * Load data from localStorage
   * @returns {Object} Application data or default data if not found
   */
  load() {
    try {
      const data = localStorage.getItem(Config.STORAGE_KEY);
      return data ? Utils.safeJsonParse(data, this.getDefaultData()) : this.getDefaultData();
    } catch (error) {
      console.warn('Failed to load data:', error);
      return this.getDefaultData();
    }
  },

  /**
   * Save data to localStorage
   * @param {Object} data - Application data to save
   * @returns {boolean} True if save successful, false otherwise
   */
  save(data) {
    try {
      const jsonString = Utils.safeJsonStringify(data);
      localStorage.setItem(Config.STORAGE_KEY, jsonString);
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  },

  /**
   * Get default empty application state
   * @returns {Object} Default data structure
   */
  getDefaultData() {
    return {
      today: [],
      tomorrow: [],
      lastUpdated: Date.now(),
      currentDate: Utils.getTodayISO(),
      totalCompleted: 0
    };
  },

  /**
   * Clear all application data from localStorage
   */
  clear() {
    try {
      localStorage.removeItem(Config.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }
};

// Freeze to prevent modifications
Object.freeze(Storage);
