// Do It (Later) - Sync Utilities
// Handles data export/import in multiple formats

const Sync = {
  /**
   * Export data to human-readable text format
   * @param {Object} data - Application data to export
   * @returns {string} Formatted text export
   */
  exportToText(data) {
    const now = new Date();
    const dateStr = Utils.formatDate(now);

    let output = `${Config.APP_NAME} - ${dateStr}\n`;
    output += `Exported: ${now.toLocaleString()}\n`;
    output += `Tasks Completed Lifetime: ${data.totalCompleted || 0}\n`;
    output += `Format: JSON (v2 - includes all task properties)\n\n`;

    // Export full data as JSON to preserve ALL properties
    output += JSON.stringify(data, null, 2);

    output += `\n\n---\n`;
    output += `This file can be imported back into ${Config.APP_NAME}\n`;
    output += `All task properties preserved: important, deadline, parentId, completed, etc.\n`;

    return output;
  },

  /**
   * Parse text format back to data structure
   * @param {string} text - Exported text to parse
   * @returns {Object} Parsed application data
   */
  parseFromText(text) {
    // Try to parse as JSON first (new format)
    try {
      // Find JSON content (starts with { and ends with })
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // If it has the tasks array, it's the new format
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          return parsed;
        }
        // If it has today/tomorrow arrays, convert using Storage.migrateData
        if ((parsed.today && Array.isArray(parsed.today)) || (parsed.tomorrow && Array.isArray(parsed.tomorrow))) {
          return Storage.migrateData(parsed);
        }
      }
    } catch (e) {
      // Not JSON, try old text format
    }

    // Fallback to old text format parsing
    const lines = text.split('\n').map(line => line.trim());
    const data = {
      today: [],
      tomorrow: [],
      totalCompleted: 0,
      currentDate: Utils.getTodayISO(),
      lastUpdated: Date.now()
    };

    let currentSection = null;

    lines.forEach(line => {
      // Extract total completed
      if (line.startsWith('Tasks Completed Lifetime:')) {
        const match = line.match(/(\d+)/);
        if (match) {
          data.totalCompleted = parseInt(match[1]);
        }
      }

      // Section headers
      if (line === 'TODAY:') {
        currentSection = 'today';
        return;
      }
      if (line === 'LATER:') {
        currentSection = 'tomorrow';
        return;
      }

      // Task lines
      if (currentSection && (line.startsWith('□') || line.startsWith('✓'))) {
        const completed = line.startsWith('✓');
        const text = line.substring(2).trim();

        if (text) {
          data[currentSection].push({
            id: Utils.generateId(),
            text: text,
            completed: completed,
            createdAt: Date.now()
          });
        }
      }
    });

    // Migrate old format to new format
    return Storage.migrateData(data);
  },

  /**
   * Export data to downloadable file
   * @param {Object} data - Application data to export
   * @returns {string} Downloaded filename
   */
  exportToFile(data) {
    const textData = this.exportToText(data);
    const blob = new Blob([textData], { type: Config.EXPORT_MIME_TYPE });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateStr = Utils.getTodayISO();
    const filename = `${Config.EXPORT_FILE_PREFIX}${dateStr}${Config.EXPORT_FILE_EXTENSION}`;

    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    URL.revokeObjectURL(url);

    return filename;
  },

  /**
   * Import data from file
   * @param {File} file - File object to import
   * @returns {Promise<Object>} Promise resolving to parsed data
   */
  importFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || file.type !== Config.EXPORT_MIME_TYPE) {
        reject(new Error('Please select a valid text file'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = this.parseFromText(e.target.result);
          resolve(data);
        } catch (error) {
          reject(new Error('Could not parse file: ' + error.message));
        }
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsText(file);
    });
  },

  /**
   * Generate QR code data in hyper-compressed format (v4)
   * @param {Object} data - Application data to compress
   * @returns {string} Compressed QR data string
   */
  generateQRData(data) {
    // Hyper-compressed format v4 - aggressive optimization
    // Only include incomplete tasks to reduce size
    const incompleteTasks = data.tasks ? data.tasks.filter(task => !task.completed) : [];

    // Create ID→index mapping (reduces ID size from ~18 chars to 1-2 chars)
    const idMap = new Map();
    incompleteTasks.forEach((task, idx) => {
      idMap.set(task.id, idx);
    });

    // Helper: convert ISO date to days-from-today
    const dateToDaysOffset = (isoDate) => {
      if (!isoDate) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = new Date(isoDate);
      deadline.setHours(0, 0, 0, 0);
      return Math.round((deadline - today) / 86400000); // milliseconds per day
    };

    // Group tasks by list to eliminate repeated list field
    const todayTasks = [];
    const tomorrowTasks = [];

    incompleteTasks.forEach((task, idx) => {
      const compressed = {
        i: idx,                    // index (instead of full ID)
        x: task.text              // text
      };

      // Only include non-default values to save space
      if (task.important) compressed.m = 1;                           // important (mark)
      if (task.deadline) compressed.d = dateToDaysOffset(task.deadline);  // deadline as days offset
      if (task.parentId) compressed.p = idMap.get(task.parentId);    // parent index (not full ID)

      // Group by list
      if (task.list === 'today') {
        todayTasks.push(compressed);
      } else {
        tomorrowTasks.push(compressed);
      }
    });

    const qrData = {
      t: todayTasks,           // today tasks
      l: tomorrowTasks,        // later/tomorrow tasks
      c: data.totalCompleted || 0,  // totalCompleted
      v: 4  // version 4 = hyper-compressed format
    };

    // Convert to JSON and base64 encode for additional compression
    const jsonStr = Utils.safeJsonStringify(qrData);
    const base64 = btoa(jsonStr);

    console.log(`📊 QR Data: ${incompleteTasks.length} tasks, ${jsonStr.length}→${base64.length} bytes (${Math.round((1-base64.length/jsonStr.length)*100)}% reduction)`);

    return base64;
  },

  /**
   * Parse QR code data in hyper-compressed format (v4)
   * @param {string} qrData - Base64-encoded QR code data string
   * @returns {Object} Parsed application data
   */
  parseQRData(qrData) {
    try {
      // Decode base64
      const jsonStr = atob(qrData);
      const parsed = Utils.safeJsonParse(jsonStr);

      // Hyper-compressed format (v4): {t: [today], l: [tomorrow], c, v: 4}
      if (!parsed || parsed.v !== 4) {
        throw new Error('Invalid QR code format (expected v4 hyper-compressed format)');
      }

      // Helper: convert days-offset to ISO date
      const daysOffsetToDate = (offset) => {
        if (offset == null) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadline = new Date(today.getTime() + offset * 86400000);
        return deadline.toISOString();
      };

      // Generate new IDs for all tasks
      const idMap = new Map(); // index → new ID
      const todayTasks = parsed.t || [];
      const tomorrowTasks = parsed.l || [];
      const allCompressed = [...todayTasks, ...tomorrowTasks];

      // First pass: generate IDs
      allCompressed.forEach((task) => {
        idMap.set(task.i, Utils.generateId());
      });

      // Second pass: decompress tasks with proper IDs and parentIds
      const tasks = [];

      todayTasks.forEach(task => {
        tasks.push({
          id: idMap.get(task.i),
          text: task.x,
          list: 'today',
          completed: false,  // QR only contains incomplete tasks
          important: task.m === 1,
          deadline: daysOffsetToDate(task.d),
          parentId: task.p != null ? idMap.get(task.p) : null,
          isExpanded: true,  // default true
          createdAt: Date.now()
        });
      });

      tomorrowTasks.forEach(task => {
        tasks.push({
          id: idMap.get(task.i),
          text: task.x,
          list: 'tomorrow',
          completed: false,  // QR only contains incomplete tasks
          important: task.m === 1,
          deadline: daysOffsetToDate(task.d),
          parentId: task.p != null ? idMap.get(task.p) : null,
          isExpanded: true,  // default true
          createdAt: Date.now()
        });
      });

      return {
        tasks: tasks,
        totalCompleted: parsed.c || 0,
        version: 2,  // Convert to internal v2 format
        currentDate: Utils.getTodayISO(),
        lastUpdated: Date.now()
      };

    } catch (error) {
      throw new Error('Invalid QR code data: ' + error.message);
    }
  }
};

// Freeze to prevent modifications
Object.freeze(Sync);