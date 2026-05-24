#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '../..');
const LLM_UI_DIR = path.join(PROJECT_ROOT, 'llm-ui');

function log(msg) {
  console.log(`[ESLint Hook] ${msg}`);
}

function logError(msg) {
  console.error(`[ESLint Hook Error] ${msg}`);
}

// Check if we have stdin input (Claude Code hooks receive tool details via stdin)
let stdinData = '';
try {
  stdinData = fs.readFileSync(0, 'utf-8');
} catch (e) {
  // Stdin might not be readable or is empty
}

// Helper to run ESLint on a file
function runESLintOnFile(filePath) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(PROJECT_ROOT, filePath);
  
  // Only lint file types configured or typical for ESLint (js, jsx, ts, tsx)
  const ext = path.extname(absolutePath).toLowerCase();
  if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
    return;
  }

  // Ensure file exists
  if (!fs.existsSync(absolutePath)) {
    return;
  }

  log(`Running ESLint on: ${path.relative(PROJECT_ROOT, absolutePath)}`);
  
  try {
    // Run eslint via npx inside the llm-ui directory so it uses the correct config and node_modules
    execSync(`npx eslint "${absolutePath}" --fix`, {
      cwd: LLM_UI_DIR,
      stdio: 'inherit'
    });
    log(`ESLint passed!`);
  } catch (error) {
    // execSync will throw if ESLint exits with a non-zero code.
    // We exit with 1 to indicate the hook failed (and alert Claude Code of lint issues).
    process.exit(1);
  }
}

if (stdinData.trim()) {
  try {
    const data = JSON.parse(stdinData);
    const toolInput = data.tool_input || {};
    
    // Extract file path from tool input
    const filePath = toolInput.file_path || toolInput.filePath || toolInput.path || toolInput.TargetFile;

    if (filePath) {
      runESLintOnFile(filePath);
    } else {
      // If no file path is present in the tool input, exit successfully
      process.exit(0);
    }
  } catch (e) {
    logError(`Failed to parse stdin: ${e.message}`);
    process.exit(1);
  }
} else {
  // If run without stdin (e.g., manual trigger or a stop hook), run lint on the entire llm-ui project
  log(`No stdin data. Running ESLint on entire llm-ui project...`);
  try {
    execSync('npm run lint', {
      cwd: LLM_UI_DIR,
      stdio: 'inherit'
    });
    log(`ESLint passed for the entire project!`);
  } catch (error) {
    process.exit(1);
  }
}
