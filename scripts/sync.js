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
   * Generate QR code data in ultra-compressed delimiter format (v5)
   * @param {Object} data - Application data to compress
   * @returns {string} Compressed QR data string
   */
  generateQRData(data) {
    // Ultra-compressed format v5 - delimiter-based, no JSON/base64
    // Only include incomplete tasks to reduce size
    // V3 format: get tasks from today/tomorrow arrays
    const todayIncompleteTasks = (data.today || []).filter(task => !task.completed && !task.parentId);
    const tomorrowIncompleteTasks = (data.tomorrow || []).filter(task => !task.completed && !task.parentId);
    const allIncompleteTasks = [...todayIncompleteTasks, ...tomorrowIncompleteTasks];

    // Get all subtasks (incomplete only)
    const todaySubtasks = (data.today || []).filter(task => !task.completed && task.parentId);
    const tomorrowSubtasks = (data.tomorrow || []).filter(task => !task.completed && task.parentId);
    const allSubtasks = [...todaySubtasks, ...tomorrowSubtasks];

    // Combine all incomplete tasks
    const incompleteTasks = [...allIncompleteTasks, ...allSubtasks];

    // Create ID→index mapping
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
      return Math.round((deadline - today) / 86400000);
    };

    // Helper: convert index to base36 (0-9, then A-Z for 10-35, etc.)
    const toBase36 = (num) => num.toString(36).toUpperCase();

    // Helper: determine which list a task is in (for v3 format)
    const getTaskList = (task) => {
      if (data.today && data.today.some(t => t.id === task.id)) return 'today';
      if (data.tomorrow && data.tomorrow.some(t => t.id === task.id)) return 'tomorrow';
      return 'tomorrow'; // default
    };

    // Group tasks by list
    const todayTasks = [];
    const tomorrowTasks = [];

    incompleteTasks.forEach((task, idx) => {
      // Build task string: text[*][.parent][+days]
      let taskStr = task.text;

      // Append important flag
      if (task.important) taskStr += '*';

      // Append parent reference
      if (task.parentId) {
        const parentIdx = idMap.get(task.parentId);
        if (parentIdx !== undefined) {
          taskStr += '.' + toBase36(parentIdx);
        }
      }

      // Append deadline offset
      if (task.deadline) {
        const offset = dateToDaysOffset(task.deadline);
        if (offset !== null) {
          taskStr += (offset >= 0 ? '+' : '') + offset;
        }
      }

      // Group by list (v3 format)
      if (getTaskList(task) === 'today') {
        todayTasks.push(taskStr);
      } else {
        tomorrowTasks.push(taskStr);
      }
    });

    // Build final format: 5~C~TODAY~LATER (using ASCII delimiter ~)
    const parts = [
      '5',                                    // version
      data.totalCompleted || 0,               // completed count
      todayTasks.join('|'),                   // today tasks
      tomorrowTasks.join('|')                 // later tasks
    ];

    const qrData = parts.join('~');

    console.log(`📊 QR Data v5: ${incompleteTasks.length} tasks, ${qrData.length} bytes (delimiter format)`);

    return qrData;
  },

  /**
   * Parse QR code data in ultra-compressed delimiter format (v5)
   * @param {string} qrData - Delimiter-based QR code data string
   * @returns {Object} Parsed application data
   */
  parseQRData(qrData) {
    try {
      // Parse v5 format: 5~C~TODAY~LATER (ASCII delimiter ~)
      const parts = qrData.split('~');

      if (parts.length !== 4 || parts[0] !== '5') {
        throw new Error('Invalid QR code format (expected v5 delimiter format)');
      }

      const version = parts[0];
      const totalCompleted = parseInt(parts[1]) || 0;
      const todaySection = parts[2];
      const laterSection = parts[3];

      // Helper: convert days-offset to ISO date
      const daysOffsetToDate = (offset) => {
        if (offset == null) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadline = new Date(today.getTime() + offset * 86400000);
        return deadline.toISOString();
      };

      // Helper: parse base36 to number
      const fromBase36 = (str) => parseInt(str, 36);

      // Helper: parse task string: text[*][.parent][+days]
      const parseTask = (taskStr, listName, taskIndex) => {
        if (!taskStr) return null;

        let text = taskStr;
        let important = false;
        let parentIdx = null;
        let deadline = null;

        // Extract deadline offset (+ or - followed by digits at end)
        const deadlineMatch = text.match(/([+-]\d+)$/);
        if (deadlineMatch) {
          deadline = daysOffsetToDate(parseInt(deadlineMatch[1]));
          text = text.substring(0, deadlineMatch.index);
        }

        // Extract parent reference (.N at end, where N is base36)
        const parentMatch = text.match(/\.([0-9A-Z]+)$/);
        if (parentMatch) {
          parentIdx = fromBase36(parentMatch[1]);
          text = text.substring(0, parentMatch.index);
        }

        // Extract important flag (* at end)
        if (text.endsWith('*')) {
          important = true;
          text = text.substring(0, text.length - 1);
        }

        return {
          text,
          important,
          parentIdx,
          deadline,
          list: listName,
          index: taskIndex
        };
      };

      // Parse today and later tasks
      const todayTaskStrs = todaySection ? todaySection.split('|').filter(s => s) : [];
      const laterTaskStrs = laterSection ? laterSection.split('|').filter(s => s) : [];

      // Parse all tasks
      const parsedTasks = [];
      let globalIndex = 0;

      todayTaskStrs.forEach(taskStr => {
        const parsed = parseTask(taskStr, 'today', globalIndex++);
        if (parsed) parsedTasks.push(parsed);
      });

      laterTaskStrs.forEach(taskStr => {
        const parsed = parseTask(taskStr, 'tomorrow', globalIndex++);
        if (parsed) parsedTasks.push(parsed);
      });

      // Generate IDs and build ID map
      const idMap = new Map(); // index → new ID
      parsedTasks.forEach((task) => {
        idMap.set(task.index, Utils.generateId());
      });

      // Build final task objects
      const tasks = parsedTasks.map(task => ({
        id: idMap.get(task.index),
        text: task.text,
        list: task.list,
        completed: false,  // QR only contains incomplete tasks
        important: task.important,
        deadline: task.deadline,
        parentId: task.parentIdx !== null ? idMap.get(task.parentIdx) : null,
        isExpanded: true,  // default true
        createdAt: Date.now()
      }));

      return {
        tasks: tasks,
        totalCompleted: totalCompleted,
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