/**
 * TaskNode - Tree-based task representation
 *
 * Design principles:
 * - Tasks are uniform: no distinction between "task" and "subtask"
 * - Parent/child is relational: direct references, not ID lookups
 * - Fractal: any node can have children, render is recursive
 * - Self-aware: knows its parent, children, and how to operate on itself
 */

let nodeIdCounter = 0;

function generateNodeId() {
  return `node-${Date.now()}-${++nodeIdCounter}`;
}

class TaskNode {
  constructor(text, options = {}) {
    this.id = options.id || generateNodeId();
    this.text = text;
    this.completed = options.completed || false;
    this.important = options.important || false;
    this.deadline = options.deadline || null;
    this.createdAt = options.createdAt || Date.now();

    // Per-list expansion state (preserves current UX behavior)
    // A parent can be expanded in Today but collapsed in Later
    this.expansionState = {
      today: options.expandedInToday !== false,
      later: options.expandedInLater !== false
    };

    // Tree relationships - direct references, not IDs
    this.parent = null;
    this.children = [];
  }

  /**
   * Check if this is a virtual root node (container for a list)
   */
  isVirtualRoot() {
    return this.text.startsWith('__') && this.text.endsWith('__');
  }

  // ─────────────────────────────────────────────────────────────
  // Tree Operations
  // ─────────────────────────────────────────────────────────────

  /**
   * Add a child task
   */
  addChild(text, options = {}) {
    const child = new TaskNode(text, options);
    child.parent = this;
    this.children.push(child);
    return child;
  }

  /**
   * Remove this node from its parent
   */
  detach() {
    if (this.parent) {
      this.parent.children = this.parent.children.filter(c => c !== this);
      this.parent = null;
    }
    return this;
  }

  /**
   * Move this node to be a child of another node
   */
  moveTo(newParent) {
    this.detach();
    this.parent = newParent;
    newParent.children.push(this);
    return this;
  }

  /**
   * Is this a root node? (no parent)
   */
  isRoot() {
    return this.parent === null;
  }

  /**
   * Is this a leaf node? (no children)
   */
  isLeaf() {
    return this.children.length === 0;
  }

  /**
   * Get the root of this tree
   */
  getRoot() {
    let node = this;
    while (node.parent) {
      node = node.parent;
    }
    return node;
  }

  /**
   * Get depth in tree (root = 0)
   */
  getDepth() {
    let depth = 0;
    let node = this;
    while (node.parent) {
      depth++;
      node = node.parent;
    }
    return depth;
  }

  // ─────────────────────────────────────────────────────────────
  // Task Operations
  // ─────────────────────────────────────────────────────────────

  /**
   * Toggle completion state
   * Returns info about what happened for UI feedback
   */
  toggleComplete() {
    this.completed = !this.completed;

    const result = {
      node: this,
      newState: this.completed,
      cascadeUp: null,
      cascadeDown: null
    };

    if (this.completed) {
      // Completed: check if all siblings are done (parent auto-completes?)
      if (this.parent && !this.parent.isRoot()) {
        const allSiblingsDone = this.parent.children.every(c => c.completed);
        if (allSiblingsDone && !this.parent.completed) {
          this.parent.completed = true;
          result.cascadeUp = this.parent;
        }
      }
    } else {
      // Uncompleted: parent should also uncomplete
      if (this.parent && !this.parent.isRoot() && this.parent.completed) {
        this.parent.completed = false;
        result.cascadeUp = this.parent;
      }
    }

    return result;
  }

  /**
   * Toggle importance
   */
  toggleImportant() {
    this.important = !this.important;

    // Re-sort among siblings: important items first
    if (this.parent) {
      this.parent.sortChildren();
    }

    return this;
  }

  /**
   * Sort children: important first, then by creation time
   */
  sortChildren() {
    this.children.sort((a, b) => {
      if (a.important && !b.important) return -1;
      if (!a.important && b.important) return 1;
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Check if expanded in a specific list
   * @param {string} listName - 'today' or 'tomorrow' (maps to 'later')
   */
  isExpandedIn(listName) {
    const key = listName === 'tomorrow' ? 'later' : listName;
    return this.expansionState[key];
  }

  /**
   * Toggle expansion state for a specific list
   * @param {string} listName - 'today' or 'tomorrow' (maps to 'later')
   */
  toggleExpansionIn(listName) {
    const key = listName === 'tomorrow' ? 'later' : listName;
    this.expansionState[key] = !this.expansionState[key];
    return this;
  }

  /**
   * Set expansion state for a specific list
   * @param {string} listName - 'today' or 'tomorrow' (maps to 'later')
   * @param {boolean} expanded - new expansion state
   */
  setExpandedIn(listName, expanded) {
    const key = listName === 'tomorrow' ? 'later' : listName;
    this.expansionState[key] = expanded;
    return this;
  }

  // ─────────────────────────────────────────────────────────────
  // Traversal
  // ─────────────────────────────────────────────────────────────

  /**
   * Traverse tree depth-first, calling callback on each node
   */
  traverse(callback) {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }

  /**
   * Find a node by ID in this subtree
   */
  findById(id) {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.findById(id);
      if (found) return found;
    }
    return null;
  }

  /**
   * Find a node by text (first match)
   */
  findByText(text) {
    if (this.text === text) return this;
    for (const child of this.children) {
      const found = child.findByText(text);
      if (found) return found;
    }
    return null;
  }

  /**
   * Get all descendants as flat array
   */
  flatten() {
    const result = [];
    this.traverse(node => {
      if (node !== this) result.push(node); // exclude self (root)
    });
    return result;
  }

  // ─────────────────────────────────────────────────────────────
  // Serialization
  // ─────────────────────────────────────────────────────────────

  /**
   * Serialize to plain object (for localStorage)
   * Uses expandedInToday/expandedInLater for v3 format compatibility
   */
  toJSON() {
    return {
      id: this.id,
      text: this.text,
      completed: this.completed,
      important: this.important,
      expandedInToday: this.expansionState.today,
      expandedInLater: this.expansionState.later,
      deadline: this.deadline,
      createdAt: this.createdAt,
      children: this.children.map(child => child.toJSON())
    };
  }

  /**
   * Deserialize from plain object
   * Handles both v3 format (expandedInToday/Later) and legacy (isExpanded)
   */
  static fromJSON(data, parent = null) {
    // Handle legacy isExpanded vs new expandedInToday/Later format
    const expandedInToday = data.expandedInToday !== undefined
      ? data.expandedInToday
      : (data.isExpanded !== false);
    const expandedInLater = data.expandedInLater !== undefined
      ? data.expandedInLater
      : (data.isExpanded !== false);

    const node = new TaskNode(data.text, {
      id: data.id,
      completed: data.completed,
      important: data.important,
      expandedInToday,
      expandedInLater,
      deadline: data.deadline,
      createdAt: data.createdAt
    });

    node.parent = parent;
    node.children = (data.children || []).map(childData =>
      TaskNode.fromJSON(childData, node)
    );

    return node;
  }

  // ─────────────────────────────────────────────────────────────
  // Rendering (Fractal)
  // ─────────────────────────────────────────────────────────────

  /**
   * Render this node and all children
   * Returns a DOM element
   * @param {Object} options - Render options
   * @param {string} options.listName - Which list we're rendering for ('today' or 'tomorrow')
   */
  render(options = {}) {
    const depth = this.getDepth();
    const listName = options.listName || 'today';

    // Virtual roots just render their children
    if (this.isVirtualRoot()) {
      const container = document.createElement('div');
      container.className = 'task-list';
      for (const child of this.children) {
        container.appendChild(child.render(options));
      }
      return container;
    }

    // Get per-list expansion state
    const isExpanded = this.isExpandedIn(listName);

    // Create task element
    const el = document.createElement('div');
    el.className = 'task-node';
    el.dataset.id = this.id;
    el.dataset.depth = depth;

    if (this.completed) el.classList.add('completed');
    if (this.important) el.classList.add('important');

    // Task content
    const content = document.createElement('div');
    content.className = 'task-content';

    // Expand icon (if has children)
    if (this.children.length > 0) {
      const expandIcon = document.createElement('span');
      expandIcon.className = 'expand-icon';
      expandIcon.textContent = isExpanded ? '▼' : '▶';
      content.appendChild(expandIcon);
    }

    // Task text
    const textSpan = document.createElement('span');
    textSpan.className = 'task-text';
    textSpan.textContent = this.text;
    content.appendChild(textSpan);

    el.appendChild(content);

    // Render children (if expanded)
    if (this.children.length > 0 && isExpanded) {
      const childContainer = document.createElement('div');
      childContainer.className = 'task-children';

      for (const child of this.children) {
        childContainer.appendChild(child.render(options));
      }

      el.appendChild(childContainer);
    }

    return el;
  }
}

// ─────────────────────────────────────────────────────────────
// TaskTree - Container for a list (Today/Later)
// ─────────────────────────────────────────────────────────────

class TaskTree {
  constructor(name) {
    this.root = new TaskNode(`__${name}__`);
    this.name = name;
  }

  addTask(text, options = {}) {
    return this.root.addChild(text, options);
  }

  findById(id) {
    return this.root.findById(id);
  }

  findByText(text) {
    return this.root.findByText(text);
  }

  getAllTasks() {
    return this.root.flatten();
  }

  render(container) {
    container.innerHTML = '';
    container.appendChild(this.root.render({ listName: this.name }));
  }

  toJSON() {
    return {
      name: this.name,
      children: this.root.children.map(c => c.toJSON())
    };
  }

  static fromJSON(data) {
    const tree = new TaskTree(data.name);
    tree.root.children = (data.children || []).map(childData =>
      TaskNode.fromJSON(childData, tree.root)
    );
    return tree;
  }
}

// Export for browser (global scope) and ES modules (Node.js tests)
// Browser loads as type="module", Node.js uses import statement
// Both get: window.TaskNode/TaskTree AND ES module exports

// Assign to window for browser global access
// Module scripts run after DOM parsing, so this is safe
if (typeof window !== 'undefined') {
  window.TaskNode = TaskNode;
  window.TaskTree = TaskTree;
}

// ES module export
export { TaskNode, TaskTree };
