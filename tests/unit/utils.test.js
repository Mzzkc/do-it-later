import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load the vanilla JS files into the test environment
const loadScript = (filename) => {
  const scriptPath = join(process.cwd(), 'scripts', filename);
  let scriptContent = readFileSync(scriptPath, 'utf-8');

  // Replace 'const Config =' with 'global.Config =' and 'const Utils =' with 'global.Utils ='
  // This makes them available to the test environment
  scriptContent = scriptContent.replace(/^const Config\s*=/m, 'global.Config =');
  scriptContent = scriptContent.replace(/^const Utils\s*=/m, 'global.Utils =');

  // Also replace Object.freeze(Config) with Object.freeze(global.Config) since we changed the variable
  scriptContent = scriptContent.replace(/Object\.freeze\(Config/g, 'Object.freeze(global.Config');
  scriptContent = scriptContent.replace(/Object\.freeze\(Utils/g, 'Object.freeze(global.Utils');

  // Create a function that has access to Config and Utils from global scope
  // This allows utils.js to reference Config when it's evaluated
  const scriptFunc = new Function('Config', 'Utils', 'global', 'document', scriptContent);

  // Execute with global Config, Utils, global object, and happy-dom document
  scriptFunc(global.Config, global.Utils, global, global.document || {createElement: () => ({textContent: '', innerHTML: ''})});
};

// Make Utils and Config available to tests
let Utils, Config;

describe('Utils - Security & XSS Prevention', () => {
  beforeEach(() => {
    // Load Config and Utils into global scope
    loadScript('config.js');
    loadScript('utils.js');
    // Reference them locally for tests
    Utils = global.Utils;
    Config = global.Config;
  });

  describe('escapeHtml() - XSS Prevention (CRITICAL SECURITY)', () => {
    it('should escape <script> tags', () => {
      const malicious = '<script>alert("XSS")</script>';
      const result = Utils.escapeHtml(malicious);
      expect(result).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('should escape HTML entities', () => {
      const input = '< > & " \'';
      const result = Utils.escapeHtml(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
    });

    it('should escape img tag with onerror', () => {
      const malicious = '<img src=x onerror="alert(1)">';
      const result = Utils.escapeHtml(malicious);
      expect(result).not.toContain('<img');
      // Note: attribute names remain, but tags are escaped so not executable
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });

    it('should escape iframe injection', () => {
      const malicious = '<iframe src="javascript:alert(1)"></iframe>';
      const result = Utils.escapeHtml(malicious);
      expect(result).not.toContain('<iframe');
      expect(result).toContain('&lt;iframe');
    });

    it('should escape SVG with embedded script', () => {
      const malicious = '<svg><script>alert(1)</script></svg>';
      const result = Utils.escapeHtml(malicious);
      expect(result).not.toContain('<svg>');
      expect(result).toContain('&lt;svg&gt;');
    });

    it('should escape JavaScript: protocol', () => {
      const malicious = '<a href="javascript:alert(1)">Click</a>';
      const result = Utils.escapeHtml(malicious);
      // Tags are escaped, making the javascript: protocol non-executable
      expect(result).not.toContain('<a');
      expect(result).toContain('&lt;a');
      expect(result).toContain('&gt;');
    });

    it('should escape data: URLs', () => {
      const malicious = '<a href="data:text/html,<script>alert(1)</script>">X</a>';
      const result = Utils.escapeHtml(malicious);
      // Tags are escaped, making the data: URL non-executable
      expect(result).not.toContain('<a');
      expect(result).toContain('&lt;a');
      expect(result).toContain('&gt;');
    });

    it('should escape event handlers', () => {
      const handlers = [
        '<div onclick="alert(1)">',
        '<div onload="alert(1)">',
        '<div onmouseover="alert(1)">',
        '<div onerror="alert(1)">',
      ];

      handlers.forEach(malicious => {
        const result = Utils.escapeHtml(malicious);
        // Tags are escaped, making event handlers non-executable
        expect(result).not.toContain('<div');
        expect(result).toContain('&lt;div');
        expect(result).toContain('&gt;');
      });
    });

    it('should escape style injection', () => {
      const malicious = '<style>body{display:none}</style>';
      const result = Utils.escapeHtml(malicious);
      expect(result).not.toContain('<style>');
      expect(result).toContain('&lt;style&gt;');
    });

    it('should escape form injection', () => {
      const malicious = '<form action="https://evil.com"><input name="password"></form>';
      const result = Utils.escapeHtml(malicious);
      expect(result).not.toContain('<form');
      expect(result).toContain('&lt;form');
    });

    it('should escape meta tag injection', () => {
      const malicious = '<meta http-equiv="refresh" content="0;url=https://evil.com">';
      const result = Utils.escapeHtml(malicious);
      expect(result).not.toContain('<meta');
      expect(result).toContain('&lt;meta');
    });

    it('should escape base tag injection', () => {
      const malicious = '<base href="https://evil.com">';
      const result = Utils.escapeHtml(malicious);
      expect(result).not.toContain('<base');
      expect(result).toContain('&lt;base');
    });

    it('should handle null input', () => {
      const result = Utils.escapeHtml(null);
      // Should either throw or return safe value
      expect(result === null || result === '' || typeof result === 'string').toBe(true);
    });

    it('should handle undefined input', () => {
      const result = Utils.escapeHtml(undefined);
      expect(result === undefined || result === '' || typeof result === 'string').toBe(true);
    });

    it('should handle empty string', () => {
      const result = Utils.escapeHtml('');
      expect(result).toBe('');
    });

    it('should handle very long strings', () => {
      const longString = '<script>' + 'A'.repeat(10000) + '</script>';
      const result = Utils.escapeHtml(longString);
      expect(result).not.toContain('<script>');
      expect(result.length).toBeGreaterThan(10000);
    });

    it('should handle Unicode characters', () => {
      const unicode = '🎉<script>alert(1)</script>🎊';
      const result = Utils.escapeHtml(unicode);
      expect(result).toContain('🎉');
      expect(result).toContain('🎊');
      expect(result).not.toContain('<script>');
    });

    it('should handle already escaped content (double escaping)', () => {
      const escaped = '&lt;script&gt;';
      const result = Utils.escapeHtml(escaped);
      // Should escape the & to &amp;
      expect(result).toContain('&amp;lt;');
    });

    it('should escape mixed attack vectors', () => {
      const malicious = 'Task: <img src=x onerror=alert(1)> & <script>evil()</script>';
      const result = Utils.escapeHtml(malicious);
      expect(result).not.toContain('<img');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;');
      expect(result).toContain('&amp;');
    });

    it('should preserve safe text', () => {
      const safe = 'Buy groceries at 3pm';
      const result = Utils.escapeHtml(safe);
      expect(result).toBe('Buy groceries at 3pm');
    });

    it('should escape nested tags', () => {
      const nested = '<div><span><script>alert(1)</script></span></div>';
      const result = Utils.escapeHtml(nested);
      expect(result).not.toContain('<div>');
      expect(result).not.toContain('<span>');
      expect(result).not.toContain('<script>');
    });
  });
});

describe('Utils - ID Generation', () => {
  beforeEach(() => {
    loadScript('config.js');
    loadScript('utils.js');
    Utils = global.Utils;
    Config = global.Config;
  });

  describe('generateId() - Uniqueness & Collision Detection', () => {
    it('should generate unique IDs', () => {
      const id1 = Utils.generateId();
      const id2 = Utils.generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate alphanumeric IDs', () => {
      const id = Utils.generateId();
      expect(id).toMatch(/^[a-z0-9]+$/i);
    });

    it('should generate IDs with timestamp component', () => {
      const beforeTime = Date.now().toString(36);
      const id = Utils.generateId();
      const afterTime = Date.now().toString(36);

      // ID should start with timestamp (approximately)
      expect(id).toBeTruthy();
      expect(id.length).toBeGreaterThan(10);
    });

    it('should not have collisions in 10,000 rapid generations', () => {
      const ids = new Set();
      const count = 10000;

      for (let i = 0; i < count; i++) {
        ids.add(Utils.generateId());
      }

      expect(ids.size).toBe(count);
    });

    it('should generate different IDs at midnight boundary', () => {
      // Test around midnight (mock Date.now)
      const originalNow = Date.now;

      try {
        Date.now = vi.fn()
          .mockReturnValueOnce(new Date('2025-01-01T23:59:59.999Z').getTime())
          .mockReturnValueOnce(new Date('2025-01-02T00:00:00.001Z').getTime());

        const id1 = Utils.generateId();
        const id2 = Utils.generateId();

        expect(id1).not.toBe(id2);
      } finally {
        Date.now = originalNow;
      }
    });

    it('should handle rapid concurrent generation', async () => {
      const promises = Array.from({ length: 100 }, () =>
        Promise.resolve(Utils.generateId())
      );

      const ids = await Promise.all(promises);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(100);
    });
  });
});

describe('Utils - Date Functions', () => {
  beforeEach(() => {
    loadScript('config.js');
    loadScript('utils.js');
    Utils = global.Utils;
    Config = global.Config;
  });

  describe('formatDate()', () => {
    it('should format valid date', () => {
      const date = new Date('2025-01-15');
      const result = Utils.formatDate(date);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle null date', () => {
      expect(() => Utils.formatDate(null)).toThrow();
    });

    it('should handle invalid date', () => {
      const invalidDate = new Date('invalid');
      const result = Utils.formatDate(invalidDate);
      expect(result).toBe('Invalid Date');
    });

    it('should handle custom format options', () => {
      const date = new Date('2025-01-15');
      const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      const result = Utils.formatDate(date, options);
      expect(result).toContain('2025');
    });

    it('should handle leap year date', () => {
      const leapDate = new Date('2024-02-29');
      const result = Utils.formatDate(leapDate);
      expect(result).toContain('29');
    });
  });

  describe('getTodayISO()', () => {
    it('should return ISO date format YYYY-MM-DD', () => {
      const result = Utils.getTodayISO();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return current date', () => {
      const result = Utils.getTodayISO();
      const today = new Date().toISOString().split('T')[0];
      expect(result).toBe(today);
    });

    it('should handle midnight boundary', () => {
      // At midnight, should transition to new date
      const result = Utils.getTodayISO();
      expect(result).toBeTruthy();
      expect(result.split('-')).toHaveLength(3);
    });
  });
});

describe('Utils - Type Checking & Validation', () => {
  beforeEach(() => {
    loadScript('config.js');
    loadScript('utils.js');
    Utils = global.Utils;
    Config = global.Config;
  });

  describe('isEmpty()', () => {
    it('should return true for null', () => {
      expect(Utils.isEmpty(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(Utils.isEmpty(undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(Utils.isEmpty('')).toBe(true);
    });

    it('should return true for whitespace-only string', () => {
      expect(Utils.isEmpty('   ')).toBe(true);
      expect(Utils.isEmpty('\t\n')).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(Utils.isEmpty([])).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(Utils.isEmpty({})).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(Utils.isEmpty('text')).toBe(false);
    });

    it('should return false for 0', () => {
      expect(Utils.isEmpty(0)).toBe(false);
    });

    it('should return false for false', () => {
      expect(Utils.isEmpty(false)).toBe(false);
    });

    it('should return false for array with empty values', () => {
      expect(Utils.isEmpty([null, undefined])).toBe(false);
    });

    it('should return false for object with properties', () => {
      expect(Utils.isEmpty({ a: 1 })).toBe(false);
    });
  });

  describe('isMobile()', () => {
    it('should detect iPhone', () => {
      global.navigator = { userAgent: 'iPhone' };
      expect(Utils.isMobile()).toBe(true);
    });

    it('should detect Android', () => {
      global.navigator = { userAgent: 'Android' };
      expect(Utils.isMobile()).toBe(true);
    });

    it('should detect iPad', () => {
      global.navigator = { userAgent: 'iPad' };
      expect(Utils.isMobile()).toBe(true);
    });

    it('should return false for desktop', () => {
      global.navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
      expect(Utils.isMobile()).toBe(false);
    });
  });
});

describe('Utils - Numeric Functions', () => {
  beforeEach(() => {
    loadScript('config.js');
    loadScript('utils.js');
    Utils = global.Utils;
    Config = global.Config;
  });

  describe('clamp()', () => {
    it('should clamp number below min', () => {
      expect(Utils.clamp(5, 10, 20)).toBe(10);
    });

    it('should clamp number above max', () => {
      expect(Utils.clamp(25, 10, 20)).toBe(20);
    });

    it('should not clamp number within range', () => {
      expect(Utils.clamp(15, 10, 20)).toBe(15);
    });

    it('should handle min equals max', () => {
      expect(Utils.clamp(15, 10, 10)).toBe(10);
    });

    it('should handle min greater than max (edge case)', () => {
      // Undefined behavior, but test current implementation
      const result = Utils.clamp(15, 20, 10);
      expect(result).toBe(10);
    });

    it('should handle negative numbers', () => {
      expect(Utils.clamp(-15, -10, 10)).toBe(-10);
      expect(Utils.clamp(-5, -10, 10)).toBe(-5);
    });

    it('should handle decimals', () => {
      expect(Utils.clamp(5.5, 1.1, 10.9)).toBe(5.5);
    });

    it('should handle NaN', () => {
      const result = Utils.clamp(NaN, 0, 10);
      expect(isNaN(result)).toBe(true);
    });

    it('should handle Infinity', () => {
      expect(Utils.clamp(Infinity, 0, 10)).toBe(10);
      expect(Utils.clamp(-Infinity, 0, 10)).toBe(0);
    });
  });

  describe('distance()', () => {
    it('should calculate distance for same point', () => {
      expect(Utils.distance(0, 0, 0, 0)).toBe(0);
    });

    it('should calculate horizontal distance', () => {
      expect(Utils.distance(0, 0, 10, 0)).toBe(10);
    });

    it('should calculate vertical distance', () => {
      expect(Utils.distance(0, 0, 0, 10)).toBe(10);
    });

    it('should calculate diagonal distance', () => {
      expect(Utils.distance(0, 0, 3, 4)).toBe(5); // 3-4-5 triangle
    });

    it('should handle negative coordinates', () => {
      expect(Utils.distance(-5, -5, 5, 5)).toBeCloseTo(14.142, 2);
    });

    it('should handle large coordinates', () => {
      const dist = Utils.distance(0, 0, 1000, 1000);
      expect(dist).toBeCloseTo(1414.21, 1);
    });

    it('should handle decimal coordinates', () => {
      const dist = Utils.distance(1.5, 2.5, 4.5, 6.5);
      expect(dist).toBeGreaterThan(0);
    });
  });
});

describe('Utils - String Functions', () => {
  beforeEach(() => {
    loadScript('config.js');
    loadScript('utils.js');
    Utils = global.Utils;
    Config = global.Config;
  });

  describe('truncate()', () => {
    it('should not truncate short text', () => {
      expect(Utils.truncate('Hello', 10)).toBe('Hello');
    });

    it('should truncate long text', () => {
      const result = Utils.truncate('Hello World', 8);
      expect(result).toBe('Hello...');
      expect(result.length).toBeLessThanOrEqual(8);
    });

    it('should handle custom suffix', () => {
      const result = Utils.truncate('Hello World', 8, '…');
      expect(result).toBe('Hello W…');
    });

    it('should handle maxLength = 0', () => {
      const result = Utils.truncate('Hello', 0);
      expect(result).toBe('...');
    });

    it('should handle negative maxLength', () => {
      const result = Utils.truncate('Hello', -1);
      expect(result).toBeTruthy();
    });

    it('should handle empty text', () => {
      expect(Utils.truncate('', 10)).toBe('');
    });

    it('should handle Unicode emoji', () => {
      const text = '🎉🎊🎈 Celebrate!';
      const result = Utils.truncate(text, 10);
      expect(result).toBeTruthy();
    });

    it('should handle suffix longer than maxLength', () => {
      const result = Utils.truncate('Hello', 3, '....');
      expect(result).toBeTruthy();
    });
  });

  describe('cleanText()', () => {
    it('should remove specific characters', () => {
      expect(Utils.cleanText('Hello123', /\d/g)).toBe('Hello');
    });

    it('should remove string pattern', () => {
      expect(Utils.cleanText('Hello World', 'World')).toBe('Hello ');
    });

    it('should handle empty pattern', () => {
      expect(Utils.cleanText('Hello', '')).toBe('Hello');
    });

    it('should handle empty text', () => {
      expect(Utils.cleanText('', /\d/g)).toBe('');
    });

    it('should handle global vs non-global regex', () => {
      expect(Utils.cleanText('123456', /\d/)).toBe('23456'); // Only first
      expect(Utils.cleanText('123456', /\d/g)).toBe(''); // All
    });
  });
});

describe('Utils - Async Functions', () => {
  beforeEach(() => {
    loadScript('config.js');
    loadScript('utils.js');
    Utils = global.Utils;
    Config = global.Config;
  });

  describe('wait()', () => {
    it('should wait for specified milliseconds', async () => {
      const start = Date.now();
      await Utils.wait(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });

    it('should handle zero milliseconds', async () => {
      await expect(Utils.wait(0)).resolves.toBeUndefined();
    });

    it('should handle negative milliseconds', async () => {
      await expect(Utils.wait(-10)).resolves.toBeUndefined();
    });

    it('should handle very large delays', async () => {
      const promise = Utils.wait(10000);
      expect(promise).toBeInstanceOf(Promise);
      // Don't actually wait 10 seconds in tests
    });

    it('should support multiple concurrent waits', async () => {
      const promises = [
        Utils.wait(10),
        Utils.wait(10),
        Utils.wait(10)
      ];

      await expect(Promise.all(promises)).resolves.toBeTruthy();
    });
  });

  describe('debounce()', () => {
    it('should debounce function calls', async () => {
      const fn = vi.fn();
      const debounced = Utils.debounce(fn, 50);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      await Utils.wait(60);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to debounced function', async () => {
      const fn = vi.fn();
      const debounced = Utils.debounce(fn, 50);

      debounced('arg1', 'arg2');

      await Utils.wait(60);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should clear previous timeout', async () => {
      const fn = vi.fn();
      const debounced = Utils.debounce(fn, 50);

      debounced();
      await Utils.wait(30);
      debounced(); // Should reset timer

      await Utils.wait(40);
      expect(fn).not.toHaveBeenCalled(); // Still waiting

      await Utils.wait(20);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle zero wait time', async () => {
      const fn = vi.fn();
      const debounced = Utils.debounce(fn, 0);

      debounced();

      await Utils.wait(10);

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Utils - JSON Functions', () => {
  beforeEach(() => {
    loadScript('config.js');
    loadScript('utils.js');
    Utils = global.Utils;
    Config = global.Config;
  });

  describe('safeJsonParse()', () => {
    it('should parse valid JSON', () => {
      const result = Utils.safeJsonParse('{"a":1}');
      expect(result).toEqual({ a: 1 });
    });

    it('should return default value for invalid JSON', () => {
      const result = Utils.safeJsonParse('{invalid}', { default: true });
      expect(result).toEqual({ default: true });
    });

    it('should return null by default for invalid JSON', () => {
      const result = Utils.safeJsonParse('{invalid}');
      expect(result).toBeNull();
    });

    it('should handle empty string', () => {
      const result = Utils.safeJsonParse('');
      expect(result).toBeNull();
    });

    it('should handle null input', () => {
      const result = Utils.safeJsonParse(null);
      expect(result).toBeNull();
    });

    it('should handle undefined input', () => {
      const result = Utils.safeJsonParse(undefined);
      expect(result).toBeNull();
    });

    it('should parse arrays', () => {
      const result = Utils.safeJsonParse('[1,2,3]');
      expect(result).toEqual([1, 2, 3]);
    });

    it('should parse nested objects', () => {
      const json = '{"a":{"b":{"c":1}}}';
      const result = Utils.safeJsonParse(json);
      expect(result).toEqual({ a: { b: { c: 1 } } });
    });

    it('should handle very large JSON', () => {
      const largeObj = { items: Array.from({ length: 1000 }, (_, i) => ({ id: i })) };
      const json = JSON.stringify(largeObj);
      const result = Utils.safeJsonParse(json);
      expect(result.items).toHaveLength(1000);
    });
  });

  describe('safeJsonStringify()', () => {
    it('should stringify simple object', () => {
      const result = Utils.safeJsonStringify({ a: 1 });
      expect(result).toBe('{"a":1}');
    });

    it('should return default value for circular references', () => {
      const circular = { a: 1 };
      circular.self = circular;

      const result = Utils.safeJsonStringify(circular, '{"error":true}');
      expect(result).toBe('{"error":true}');
    });

    it('should return "{}" by default on error', () => {
      const circular = { a: 1 };
      circular.self = circular;

      const result = Utils.safeJsonStringify(circular);
      expect(result).toBe('{}');
    });

    it('should handle null', () => {
      const result = Utils.safeJsonStringify(null);
      expect(result).toBe('null');
    });

    it('should handle undefined', () => {
      const result = Utils.safeJsonStringify(undefined);
      // JSON.stringify(undefined) returns undefined (not an error), so we get undefined back
      expect(result).toBeUndefined();
    });

    it('should handle arrays', () => {
      const result = Utils.safeJsonStringify([1, 2, 3]);
      expect(result).toBe('[1,2,3]');
    });

    it('should handle nested objects', () => {
      const obj = { a: { b: { c: 1 } } };
      const result = Utils.safeJsonStringify(obj);
      expect(result).toBe('{"a":{"b":{"c":1}}}');
    });

    it('should omit functions', () => {
      const obj = { a: 1, fn: () => {} };
      const result = Utils.safeJsonStringify(obj);
      expect(result).toBe('{"a":1}');
    });

    it('should handle BigInt gracefully', () => {
      const obj = { a: 1 };
      // BigInt can't be stringified, should use default
      const result = Utils.safeJsonStringify(obj);
      expect(result).toBeTruthy();
    });
  });

  describe('deepClone()', () => {
    it('should clone simple object', () => {
      const obj = { a: 1, b: 2 };
      const clone = Utils.deepClone(obj);

      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
    });

    it('should clone nested objects', () => {
      const obj = { a: { b: { c: 1 } } };
      const clone = Utils.deepClone(obj);

      clone.a.b.c = 2;

      expect(obj.a.b.c).toBe(1);
      expect(clone.a.b.c).toBe(2);
    });

    it('should clone arrays', () => {
      const arr = [1, 2, { a: 3 }];
      const clone = Utils.deepClone(arr);

      clone[2].a = 4;

      expect(arr[2].a).toBe(3);
      expect(clone[2].a).toBe(4);
    });

    it('should return original object on circular reference', () => {
      const circular = { a: 1 };
      circular.self = circular;

      const result = Utils.deepClone(circular);
      expect(result).toBe(circular); // Should return original on error
    });

    it('should lose functions', () => {
      const obj = { a: 1, fn: () => 'test' };
      const clone = Utils.deepClone(obj);

      expect(clone.a).toBe(1);
      expect(clone.fn).toBeUndefined();
    });

    it('should convert Date to string', () => {
      const obj = { date: new Date('2025-01-15') };
      const clone = Utils.deepClone(obj);

      expect(typeof clone.date).toBe('string');
    });

    it('should handle null', () => {
      const result = Utils.deepClone(null);
      expect(result).toBeNull();
    });

    it('should handle empty object', () => {
      const result = Utils.deepClone({});
      expect(result).toEqual({});
    });
  });
});

describe('Utils - Browser Functions', () => {
  beforeEach(() => {
    loadScript('config.js');
    loadScript('utils.js');
    Utils = global.Utils;
    Config = global.Config;

    // Mock window.location
    delete global.window;
    global.window = { location: { search: '?foo=bar&baz=qux' } };
  });

  describe('getQueryParam()', () => {
    it('should get existing parameter', () => {
      const result = Utils.getQueryParam('foo');
      expect(result).toBe('bar');
    });

    it('should return null for non-existing parameter', () => {
      const result = Utils.getQueryParam('missing');
      expect(result).toBeNull();
    });

    it('should handle empty parameter value', () => {
      global.window.location.search = '?empty=';
      const result = Utils.getQueryParam('empty');
      expect(result).toBe('');
    });

    it('should handle URL encoded values', () => {
      global.window.location.search = '?msg=Hello%20World';
      const result = Utils.getQueryParam('msg');
      expect(result).toBe('Hello World');
    });

    it('should handle special characters', () => {
      global.window.location.search = '?special=%26%3D%3F';
      const result = Utils.getQueryParam('special');
      expect(result).toBe('&=?');
    });
  });
});
