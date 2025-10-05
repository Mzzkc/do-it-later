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
    output += `Tasks Completed Lifetime: ${data.totalCompleted || 0}\n\n`;

    // Today's tasks
    output += `TODAY:\n`;
    output += `======\n`;
    if (data.today && data.today.length > 0) {
      data.today.forEach(task => {
        const checkbox = task.completed ? '✓' : '□';
        output += `${checkbox} ${task.text}\n`;
      });
    } else {
      output += `(No tasks for today)\n`;
    }

    output += `\n`;

    // Later tasks
    output += `LATER:\n`;
    output += `======\n`;
    if (data.tomorrow && data.tomorrow.length > 0) {
      data.tomorrow.forEach(task => {
        const checkbox = task.completed ? '✓' : '□';
        output += `${checkbox} ${task.text}\n`;
      });
    } else {
      output += `(No tasks for later)\n`;
    }

    output += `\n---\n`;
    output += `This file can be imported back into ${Config.APP_NAME}\n`;
    output += `or edited manually and re-imported.\n`;

    return output;
  },

  /**
   * Parse text format back to data structure
   * @param {string} text - Exported text to parse
   * @returns {Object} Parsed application data
   */
  parseFromText(text) {
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

    return data;
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
    // Ultra-compressed format: T:task1|task2~L:task3|task4~C:5
    // Only include incomplete tasks (completed ones aren't needed for sync)
    // Skip task IDs (regenerate on import)

    const delimiter = new RegExp(`[${Config.SYNC.TASK_DELIMITER}${Config.SYNC.SECTION_DELIMITER}]`, 'g');

    const activeTodayTasks = data.today
      .filter(task => !task.completed)
      .map(task => {
        const cleanText = Utils.cleanText(task.text, delimiter);
        return (task.important ? Config.SYNC.IMPORTANT_PREFIX : '') + cleanText;
      })
      .join(Config.SYNC.TASK_DELIMITER);

    const activeTomorrowTasks = data.tomorrow
      .filter(task => !task.completed)
      .map(task => {
        const cleanText = Utils.cleanText(task.text, delimiter);
        return (task.important ? Config.SYNC.IMPORTANT_PREFIX : '') + cleanText;
      })
      .join(Config.SYNC.TASK_DELIMITER);

    // Format: T:tasks~L:tasks~C:count
    const parts = [];
    if (activeTodayTasks) parts.push(`${Config.SYNC.TODAY_PREFIX}${activeTodayTasks}`);
    if (activeTomorrowTasks) parts.push(`${Config.SYNC.LATER_PREFIX}${activeTomorrowTasks}`);
    if (data.totalCompleted) parts.push(`${Config.SYNC.COUNT_PREFIX}${data.totalCompleted}`);

    const compressed = parts.join(Config.SYNC.SECTION_DELIMITER);

    // Fallback to JSON if custom format would be larger (rare edge case)
    const jsonFallback = Utils.safeJsonStringify({
      t: data.today.filter(t => !t.completed).map(t => t.text),
      l: data.tomorrow.filter(t => !t.completed).map(t => t.text),
      c: data.totalCompleted || 0
    });

    return compressed.length < jsonFallback.length ? compressed : jsonFallback;
  },

  /**
   * Parse QR code data (supports both ultra-compressed and legacy formats)
   * @param {string} qrData - QR code data string
   * @returns {Object} Parsed application data
   */
  parseQRData(qrData) {
    try {
      // Try new ultra-compressed format first: T:task1|task2~L:task3~C:5
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
            // Today tasks
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
            // Tomorrow/Later tasks
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
            // Completed count
            result.totalCompleted = parseInt(part.substring(2)) || 0;
          }
        });

        return result;
      }

      // Fallback: Try legacy JSON format
      const compressed = Utils.safeJsonParse(qrData);

      // Handle old compressed format with i,x,c structure
      if (compressed && compressed.t && Array.isArray(compressed.t) && compressed.t[0] && compressed.t[0].i) {
        return {
          today: compressed.t.map(task => ({
            id: task.i,
            text: task.x,
            completed: !!task.c,
            createdAt: compressed.ts || Date.now()
          })),
          tomorrow: compressed.l.map(task => ({
            id: task.i,
            text: task.x,
            completed: !!task.c,
            createdAt: compressed.ts || Date.now()
          })),
          totalCompleted: compressed.tc || 0,
          currentDate: Utils.getTodayISO(),
          lastUpdated: compressed.ts || Date.now()
        };
      }

      // Handle simplified JSON format (t: [strings], l: [strings])
      if (compressed && compressed.t && Array.isArray(compressed.t)) {
        return {
          today: compressed.t.map(text => ({
            id: Utils.generateId(),
            text: text,
            completed: false,
            createdAt: Date.now()
          })),
          tomorrow: (compressed.l || []).map(text => ({
            id: Utils.generateId(),
            text: text,
            completed: false,
            createdAt: Date.now()
          })),
          totalCompleted: compressed.c || 0,
          currentDate: Utils.getTodayISO(),
          lastUpdated: Date.now()
        };
      }

      throw new Error('Unrecognized QR data format');

    } catch (error) {
      throw new Error('Invalid QR code data: ' + error.message);
    }
  }
};

// Freeze to prevent modifications
Object.freeze(Sync);