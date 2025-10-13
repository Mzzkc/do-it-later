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
      today: [],     // Array of tasks in Today list
      tomorrow: [],  // Array of tasks in Tomorrow list
      lastUpdated: Date.now(),
      currentDate: Utils.getTodayISO(),
      totalCompleted: 0,
      version: 3 // v3: List arrays (no task.list property)
    };
  },

  /**
   * Migrate data to v3 format (list arrays, no task.list property)
   * Handles v1→v3 and v2→v3 migrations
   * @param {Object} oldData - Data in any version format
   * @returns {Object} Data in v3 format
   */
  migrateData(oldData) {
    // If already in v3 format, return as-is
    if (oldData.version === 3 && oldData.today && oldData.tomorrow) {
      return oldData;
    }

    console.log(`🔄 Migrating data from v${oldData.version || 1} to v3...`);

    const today = [];
    const tomorrow = [];

    // Handle v2 format (tasks[] array with list property)
    if (oldData.tasks && Array.isArray(oldData.tasks)) {
      oldData.tasks.forEach(task => {
        // Remove list property and add to appropriate array
        const { list, ...taskWithoutList } = task;
        const targetList = list === 'today' ? today : tomorrow;
        targetList.push(taskWithoutList);
      });
    }
    // Handle v1 format (separate today/tomorrow arrays)
    else {
      if (oldData.today && Array.isArray(oldData.today)) {
        today.push(...oldData.today);
      }
      if (oldData.tomorrow && Array.isArray(oldData.tomorrow)) {
        tomorrow.push(...oldData.tomorrow);
      }
    }

    // Migrate expansion properties: isExpanded → expandedInToday + expandedInLater
    const migrateExpansionProps = (task) => {
      // If already has new properties, leave them as-is
      if (task.hasOwnProperty('expandedInToday') || task.hasOwnProperty('expandedInLater')) {
        return task;
      }

      // Convert from old isExpanded property, or default to true
      const expanded = task.isExpanded !== false; // Default to true if undefined
      const { isExpanded, ...taskWithoutOldProp } = task;

      return {
        ...taskWithoutOldProp,
        expandedInToday: expanded,
        expandedInLater: expanded
      };
    };

    // Apply migration to all tasks
    const migratedToday = today.map(migrateExpansionProps);
    const migratedTomorrow = tomorrow.map(migrateExpansionProps);

    // Add parents to lists where their children are
    // This ensures parents appear in both lists if they have children in both
    const allTasks = [...migratedToday, ...migratedTomorrow];
    const taskMap = new Map(allTasks.map(t => [t.id, t]));

    // Find all parent IDs with children in today
    const parentsNeededInToday = new Set();
    migratedToday.forEach(task => {
      if (task.parentId && !parentsNeededInToday.has(task.parentId)) {
        parentsNeededInToday.add(task.parentId);
      }
    });

    // Find all parent IDs with children in tomorrow
    const parentsNeededInTomorrow = new Set();
    migratedTomorrow.forEach(task => {
      if (task.parentId && !parentsNeededInTomorrow.has(task.parentId)) {
        parentsNeededInTomorrow.add(task.parentId);
      }
    });

    // Add parents to today if they have children there and aren't already there
    parentsNeededInToday.forEach(parentId => {
      const parent = taskMap.get(parentId);
      if (parent && !migratedToday.find(t => t.id === parentId)) {
        migratedToday.push(parent);
      }
    });

    // Add parents to tomorrow if they have children there and aren't already there
    parentsNeededInTomorrow.forEach(parentId => {
      const parent = taskMap.get(parentId);
      if (parent && !migratedTomorrow.find(t => t.id === parentId)) {
        migratedTomorrow.push(parent);
      }
    });

    console.log(`✅ Migrated to v3: ${migratedToday.length} tasks in today, ${migratedTomorrow.length} tasks in tomorrow`);

    return {
      today: migratedToday,
      tomorrow: migratedTomorrow,
      lastUpdated: oldData.lastUpdated || Date.now(),
      currentDate: oldData.currentDate || Utils.getTodayISO(),
      totalCompleted: oldData.totalCompleted || 0,
      version: 3
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
