import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for Do It Later unit tests
 * @see https://vitest.dev/config/
 */
export default defineConfig({
  test: {
    // Use happy-dom for DOM testing without a real browser
    environment: 'happy-dom',

    // Test files location
    include: ['tests/unit/**/*.test.js'],

    // Global test utilities
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        'docs/',
        '*.config.js',
        'scripts/qrcode.min.js', // 3rd party library
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },

  // Resolve imports for vanilla JS modules
  resolve: {
    alias: {
      '@scripts': '/scripts',
      '@': '/',
    },
  },
});
