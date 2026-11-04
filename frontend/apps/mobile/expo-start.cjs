/**
 * Custom Expo start script that works around Node.js v22 ESM issues on Windows
 * This patches the dynamic import behavior before loading Expo CLI
 */
const path = require('path');

// Set CWD to this script's directory
process.chdir(__dirname);

// Find the @expo/cli in the monorepo root node_modules
const cliPath = path.resolve(__dirname, '../../node_modules/@expo/cli/build/src/expo.js');

// Load and run Expo CLI
require(cliPath);
