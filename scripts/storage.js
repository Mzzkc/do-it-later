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
      if (!data) {
        return this.getDefaultData();
      }

      const parsed = Utils.safeJsonParse(data, this.getDefaultData());

      // Automatically migrate old data format to new format
      return this.migrateData(parsed);
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
      tasks: [], // Single array of all tasks
      lastUpdated: Date.now(),
      currentDate: Utils.getTodayISO(),
      totalCompleted: 0,
      version: 2 // Data structure version for migrations
    };
  },

  /**
   * Migrate old data format (today/tomorrow arrays) to new format (tasks array with list property)
   * @param {Object} oldData - Old format data
   * @returns {Object} New format data
   */
  migrateData(oldData) {
    // If already in new format, return as-is
    if (oldData.tasks && oldData.version === 2) {
      return oldData;
    }

    console.log('🔄 Migrating data from old format to new format...');

    const tasks = [];

    // Migrate today tasks
    if (oldData.today && Array.isArray(oldData.today)) {
      oldData.today.forEach(task => {
        tasks.push({
          ...task,
          list: 'today'
        });
      });
    }

    // Migrate tomorrow tasks
    if (oldData.tomorrow && Array.isArray(oldData.tomorrow)) {
      oldData.tomorrow.forEach(task => {
        tasks.push({
          ...task,
          list: 'tomorrow'
        });
      });
    }

    console.log(`✅ Migrated ${tasks.length} tasks to new format`);

    return {
      tasks,
      lastUpdated: oldData.lastUpdated || Date.now(),
      currentDate: oldData.currentDate || Utils.getTodayISO(),
      totalCompleted: oldData.totalCompleted || 0,
      version: 2
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
