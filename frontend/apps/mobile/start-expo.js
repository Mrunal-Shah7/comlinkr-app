#!/usr/bin/env node
/**
 * Workaround for Node.js v22+ ESM loader issue on Windows
 * This script runs Expo with the correct environment
 */
const { spawn } = require('child_process');
const path = require('path');

const projectDir = __dirname;

// Spawn expo start with proper working directory
const expo = spawn('npx', ['expo', 'start', ...process.argv.slice(2)], {
  cwd: projectDir,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    // Force CommonJS behavior
    NODE_OPTIONS: '--no-warnings',
  },
});

expo.on('close', (code) => {
  process.exit(code);
});
