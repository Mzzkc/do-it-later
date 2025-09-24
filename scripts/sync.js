// Do It (Later) - Sync Utilities
// Phase 4: Maintenance-free sync system

const Sync = {
  // Export data to human-readable text format
  exportToText(data) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let output = `Do It (Later) - ${dateStr}\n`;
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
    output += `This file can be imported back into Do It (Later)\n`;
    output += `or edited manually and re-imported.\n`;

    return output;
  },

  // Parse text format back to data structure
  parseFromText(text) {
    const lines = text.split('\n').map(line => line.trim());
    const data = {
      today: [],
      tomorrow: [],
      totalCompleted: 0,
      currentDate: new Date().toISOString().split('T')[0],
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
            id: this.generateId(),
            text: text,
            completed: completed,
            createdAt: Date.now()
          });
        }
      }
    });

    return data;
  },

  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // Export to downloadable file
  exportToFile(data) {
    const textData = this.exportToText(data);
    const blob = new Blob([textData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `do-it-later-${dateStr}.txt`;

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

  // Import from file
  importFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || file.type !== 'text/plain') {
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

  // Generate QR code data (compressed JSON)
  generateQRData(data) {
    // Create compressed version for QR code
    const compressed = {
      t: data.today.map(task => ({
        i: task.id,
        x: task.text,
        c: task.completed ? 1 : 0
      })),
      l: data.tomorrow.map(task => ({
        i: task.id,
        x: task.text,
        c: task.completed ? 1 : 0
      })),
      tc: data.totalCompleted || 0,
      d: data.currentDate,
      ts: Date.now()
    };

    return JSON.stringify(compressed);
  },

  // Parse QR code data
  parseQRData(qrData) {
    try {
      const compressed = JSON.parse(qrData);

      return {
        today: compressed.t.map(task => ({
          id: task.i,
          text: task.x,
          completed: !!task.c,
          createdAt: compressed.ts
        })),
        tomorrow: compressed.l.map(task => ({
          id: task.i,
          text: task.x,
          completed: !!task.c,
          createdAt: compressed.ts
        })),
        totalCompleted: compressed.tc || 0,
        currentDate: compressed.d,
        lastUpdated: compressed.ts
      };
    } catch (error) {
      throw new Error('Invalid QR code data');
    }
  }
};