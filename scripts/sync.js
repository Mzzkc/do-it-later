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
   * Generate QR code data in ultra-compressed format
   * @param {Object} data - Application data to compress
   * @returns {string} Compressed QR data string
   */
  generateQRData(data) {
    // Export full JSON to preserve all properties (important, deadline, parentId, etc.)
    // Only include incomplete tasks to reduce size
    const qrData = {
      tasks: data.tasks ? data.tasks.filter(task => !task.completed).map(task => ({
        id: task.id,
        text: task.text,
        list: task.list,
        important: task.important || false,
        deadline: task.deadline || null,
        parentId: task.parentId || null,
        isExpanded: task.isExpanded !== false
      })) : [],
      totalCompleted: data.totalCompleted || 0,
      version: data.version || 2
    };

    return Utils.safeJsonStringify(qrData);
  },

  /**
   * Parse QR code data (supports both new and legacy formats)
   * @param {string} qrData - QR code data string
   * @returns {Object} Parsed application data
   */
  parseQRData(qrData) {
    try {
      // Try parsing as JSON first
      const parsed = Utils.safeJsonParse(qrData);

      // New format with tasks array (v2)
      if (parsed && parsed.tasks && Array.isArray(parsed.tasks)) {
        return {
          tasks: parsed.tasks,
          totalCompleted: parsed.totalCompleted || 0,
          version: parsed.version || 2,
          currentDate: Utils.getTodayISO(),
          lastUpdated: Date.now()
        };
      }

      // Legacy format with string-based compression: T:task1|task2~L:task3~C:5
      if (qrData.includes(Config.SYNC.TODAY_PREFIX) || qrData.includes(Config.SYNC.LATER_PREFIX) || qrData.includes(Config.SYNC.COUNT_PREFIX)) {
        const parts = qrData.split(Config.SYNC.SECTION_DELIMITER);
        const result = {
          today: [],
          tomorrow: [],
          totalCompleted: 0,
          currentDate: Utils.getTodayISO(),
          lastUpdated: Date.now()
        };

        parts.forEach(part => {
          if (part.startsWith(Config.SYNC.TODAY_PREFIX)) {
            const tasksText = part.substring(2);
            if (tasksText) {
              result.today = tasksText.split(Config.SYNC.TASK_DELIMITER)
                .filter(text => text.trim())
                .map(text => {
                  const trimmedText = text.trim();
                  const isImportant = trimmedText.startsWith(Config.SYNC.IMPORTANT_PREFIX);
                  const taskText = isImportant ? trimmedText.substring(1) : trimmedText;
                  return {
                    id: Utils.generateId(),
                    text: taskText,
                    completed: false,
                    important: isImportant,
                    createdAt: Date.now()
                  };
                });
            }
          } else if (part.startsWith(Config.SYNC.LATER_PREFIX)) {
            const tasksText = part.substring(2);
            if (tasksText) {
              result.tomorrow = tasksText.split(Config.SYNC.TASK_DELIMITER)
                .filter(text => text.trim())
                .map(text => {
                  const trimmedText = text.trim();
                  const isImportant = trimmedText.startsWith(Config.SYNC.IMPORTANT_PREFIX);
                  const taskText = isImportant ? trimmedText.substring(1) : trimmedText;
                  return {
                    id: Utils.generateId(),
                    text: taskText,
                    completed: false,
                    important: isImportant,
                    createdAt: Date.now()
                  };
                });
            }
          } else if (part.startsWith(Config.SYNC.COUNT_PREFIX)) {
            result.totalCompleted = parseInt(part.substring(2)) || 0;
          }
        });

        return Storage.migrateData(result);
      }

      // Old JSON format with i,x,c structure
      if (parsed && parsed.t && Array.isArray(parsed.t) && parsed.t[0] && parsed.t[0].i) {
        const oldData = {
          today: parsed.t.map(task => ({
            id: task.i,
            text: task.x,
            completed: !!task.c,
            createdAt: parsed.ts || Date.now()
          })),
          tomorrow: parsed.l.map(task => ({
            id: task.i,
            text: task.x,
            completed: !!task.c,
            createdAt: parsed.ts || Date.now()
          })),
          totalCompleted: parsed.tc || 0,
          currentDate: Utils.getTodayISO(),
          lastUpdated: parsed.ts || Date.now()
        };
        return Storage.migrateData(oldData);
      }

      // Simplified JSON format (t: [strings], l: [strings])
      if (parsed && parsed.t && Array.isArray(parsed.t)) {
        const oldData = {
          today: parsed.t.map(text => ({
            id: Utils.generateId(),
            text: text,
            completed: false,
            createdAt: Date.now()
          })),
          tomorrow: (parsed.l || []).map(text => ({
            id: Utils.generateId(),
            text: text,
            completed: false,
            createdAt: Date.now()
          })),
          totalCompleted: parsed.c || 0,
          currentDate: Utils.getTodayISO(),
          lastUpdated: Date.now()
        };
        return Storage.migrateData(oldData);
      }

      throw new Error('Unrecognized QR data format');

    } catch (error) {
      throw new Error('Invalid QR code data: ' + error.message);
    }
  }
};

// Freeze to prevent modifications
Object.freeze(Sync);