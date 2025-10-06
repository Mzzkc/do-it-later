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
    // Ultra-compressed format to fit more tasks in QR code
    // Only include incomplete tasks to reduce size
    const incompleteTasks = data.tasks ? data.tasks.filter(task => !task.completed) : [];

    const qrData = {
      t: incompleteTasks.map(task => {
        const compressed = {
          i: task.id,                    // id
          x: task.text,                  // text
          l: task.list === 'today' ? 0 : 1  // list: 0=today, 1=tomorrow
        };

        // Only include non-default values to save space
        if (task.important) compressed.m = 1;                    // important (mark)
        if (task.deadline) compressed.d = task.deadline;         // deadline
        if (task.parentId) compressed.p = task.parentId;         // parentId
        if (task.isExpanded === false) compressed.e = 0;         // isExpanded

        return compressed;
      }),
      c: data.totalCompleted || 0,     // totalCompleted
      v: 3  // version 3 = compressed format
    };

    const jsonStr = Utils.safeJsonStringify(qrData);
    console.log(`📊 QR Data: ${incompleteTasks.length} tasks, ${jsonStr.length} bytes`);

    return jsonStr;
  },

  /**
   * Parse QR code data in compressed format (v3)
   * @param {string} qrData - QR code data string
   * @returns {Object} Parsed application data
   */
  parseQRData(qrData) {
    try {
      const parsed = Utils.safeJsonParse(qrData);

      // Compressed format (v3): {t: [{i,x,l,m?,d?,p?}], c, v}
      if (parsed && parsed.t && Array.isArray(parsed.t) && parsed.v === 3) {
        const tasks = parsed.t.map(task => ({
          id: task.i,
          text: task.x,
          list: task.l === 0 ? 'today' : 'tomorrow',
          completed: false,  // QR only contains incomplete tasks
          important: task.m === 1,
          deadline: task.d || null,
          parentId: task.p || null,
          isExpanded: task.e !== 0,  // default true unless explicitly set to 0
          createdAt: Date.now()
        }));

        return {
          tasks: tasks,
          totalCompleted: parsed.c || 0,
          version: 2,  // Convert to internal v2 format
          currentDate: Utils.getTodayISO(),
          lastUpdated: Date.now()
        };
      }

      throw new Error('Invalid QR code format (expected v3 compressed format)');

    } catch (error) {
      throw new Error('Invalid QR code data: ' + error.message);
    }
  }
};

// Freeze to prevent modifications
Object.freeze(Sync);