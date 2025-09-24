// Do It (Later) - Storage Utilities
// Phase 1: Basic localStorage foundation

const Storage = {
  KEY: 'do-it-later-data',
  
  // Get data from localStorage
  load() {
    try {
      const data = localStorage.getItem(this.KEY);
      return data ? JSON.parse(data) : this.getDefaultData();
    } catch (error) {
      console.warn('Failed to load data:', error);
      return this.getDefaultData();
    }
  },
  
  // Save data to localStorage
  save(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  },
  
  // Get default empty state
  getDefaultData() {
    return {
      today: [],
      tomorrow: [],
      lastUpdated: Date.now(),
      currentDate: new Date().toISOString().split('T')[0],
      totalCompleted: 0
    };
  },
  
  // Clear all data
  clear() {
    localStorage.removeItem(this.KEY);
  }
};
