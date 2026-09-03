#!/usr/bin/env node

/**
 * Deterministic Anti-Pattern Detector for PandaMarket Seller Dashboard
 * 
 * Rules:
 * Rule 1: Native browser dialogs (window.alert, window.confirm, window.prompt, alert(, confirm(, prompt()
 * Rule 2: Raw red hex color tokens (#B91C1C, #991B1B, #7F1D1D, #3B0D0D, #DC2626, #EF4444)
 * Rule 3: Missing dark mode class pairing on major container/card elements (missingDarkMode)
 * Rule 4: Empty inline event handlers (onClick={() => {}}, onChange={() => {}}, etc.)
 * 
 * Exit code: 0 if 0 violations, 1 if any violations exist.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Command line arguments
const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const summaryOnly = args.includes('--summary');
const isQuiet = args.includes('--quiet');

// Targets to scan
const SCAN_TARGETS = [
  path.join(rootDir, 'frontend', 'src', 'app', 'hub', 'dashboard'),
  path.join(rootDir, 'frontend', 'src', 'components', 'dashboard'),
];

// Target hex colors for Rule 2
const TARGET_RED_HEXES = ['#B91C1C', '#991B1B', '#7F1D1D', '#3B0D0D', '#DC2626', '#EF4444'];
const RED_HEX_REGEX = new RegExp(`#(?:B91C1C|991B1B|7F1D1D|3B0D0D|DC2626|EF4444)\\b`, 'gi');

// Native dialog regex for Rule 1
const DIALOG_REGEX = /(?:window\.(?:alert|confirm|prompt)|(?<![.\w$])(?:alert|confirm|prompt)\s*\()/g;

// Empty handler regex for Rule 4
const EMPTY_HANDLER_REGEX = /on[A-Z]\w*=\{(?:(?:\s*\([^)]*\)\s*|\s*\w+\s*)?=>\s*\{\s*\}|function\s*\([^)]*\)\s*\{\s*\})\}/g;

// Major container/surface classes for Rule 3
const MAJOR_LIGHT_CONTAINER_PATTERNS = [
  /\b(?:bg-white|bg-gray-50|bg-slate-50|bg-zinc-50)\b(?![^"']*dark:bg-)/,
  /\b(?:border-gray-200|border-slate-200|border-zinc-200)\b(?![^"']*dark:border-)/,
];

/**
 * Recursively find all .tsx files in directory
 */
function walkDirectory(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDirectory(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Scan a single TSX file for anti-patterns
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');

  const fileViolations = {
    file: relativePath,
    rule1_nativeDialogs: [],
    rule2_rawRedHexes: [],
    rule3_missingDarkMode: null,
    rule4_emptyHandlers: [],
  };

  // Rule 1: Native Dialogs & Rule 4: Empty Handlers & Rule 2: Line matches
  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1;
    const trimmed = line.trim();

    // Rule 1 check
    let dialogMatch;
    DIALOG_REGEX.lastIndex = 0;
    while ((dialogMatch = DIALOG_REGEX.exec(line)) !== null) {
      fileViolations.rule1_nativeDialogs.push({
        line: lineNum,
        matched: dialogMatch[0].trim(),
        snippet: trimmed,
      });
    }

    // Rule 2 line check
    let hexMatch;
    RED_HEX_REGEX.lastIndex = 0;
    while ((hexMatch = RED_HEX_REGEX.exec(line)) !== null) {
      fileViolations.rule2_rawRedHexes.push({
        line: lineNum,
        token: hexMatch[0],
        snippet: trimmed,
      });
    }

    // Rule 4 check
    let handlerMatch;
    EMPTY_HANDLER_REGEX.lastIndex = 0;
    while ((handlerMatch = EMPTY_HANDLER_REGEX.exec(line)) !== null) {
      fileViolations.rule4_emptyHandlers.push({
        line: lineNum,
        matched: handlerMatch[0],
        snippet: trimmed,
      });
    }
  });

  // Rule 3 check: Dark Mode class pairing & coverage
  const darkMatches = content.match(/\bdark:/g) || [];
  const hasStyledContainers = content.includes('className') && (
    content.includes('bg-') || content.includes('border-') || content.includes('text-')
  );

  // Check for unpaired major container elements
  const missingDarkContainers = [];
  if (darkMatches.length === 0 && hasStyledContainers) {
    // 0 dark classes in an entire styled UI component/page
    missingDarkContainers.push({
      line: 1,
      reason: 'Entire styled UI component lacks dark: classes (0 dark: occurrences)',
    });
  } else {
    // Check specific container lines for unpaired light classes
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (line.includes('className=')) {
        for (const pattern of MAJOR_LIGHT_CONTAINER_PATTERNS) {
          if (pattern.test(line) && !line.includes('dark:')) {
            // Unpaired major container/card element
            missingDarkContainers.push({
              line: lineNum,
              reason: 'Container/card element with light background/border lacks dark: pairing',
              snippet: line.trim(),
            });
            break;
          }
        }
      }
    });
  }

  if (missingDarkContainers.length > 0) {
    fileViolations.rule3_missingDarkMode = {
      darkCount: darkMatches.length,
      unpairedContainers: missingDarkContainers,
      isMissing: true,
    };
  } else {
    fileViolations.rule3_missingDarkMode = {
      darkCount: darkMatches.length,
      unpairedContainers: [],
      isMissing: false,
    };
  }

  return fileViolations;
}

/**
 * Main execution
 */
function runDetector() {
  const allFiles = [];
  for (const targetDir of SCAN_TARGETS) {
    allFiles.push(...walkDirectory(targetDir));
  }

  // Sort files for deterministic ordering
  allFiles.sort();

  const results = allFiles.map(scanFile);

  // Aggregations
  let totalRule1 = 0;
  let totalRule2 = 0;
  let totalRule3 = 0;
  let totalRule4 = 0;

  const rule1Violations = [];
  const rule2Violations = [];
  const rule3Violations = [];
  const rule4Violations = [];

  for (const res of results) {
    if (res.rule1_nativeDialogs.length > 0) {
      totalRule1 += res.rule1_nativeDialogs.length;
      rule1Violations.push({
        file: res.file,
        matches: res.rule1_nativeDialogs,
      });
    }

    if (res.rule2_rawRedHexes.length > 0) {
      totalRule2 += res.rule2_rawRedHexes.length;
      rule2Violations.push({
        file: res.file,
        count: res.rule2_rawRedHexes.length,
        matches: res.rule2_rawRedHexes,
      });
    }

    if (res.rule3_missingDarkMode && res.rule3_missingDarkMode.isMissing) {
      totalRule3 += 1;
      rule3Violations.push({
        file: res.file,
        darkCount: res.rule3_missingDarkMode.darkCount,
        details: res.rule3_missingDarkMode.unpairedContainers,
      });
    }

    if (res.rule4_emptyHandlers.length > 0) {
      totalRule4 += res.rule4_emptyHandlers.length;
      rule4Violations.push({
        file: res.file,
        matches: res.rule4_emptyHandlers,
      });
    }
  }

  const totalViolations = totalRule1 + totalRule2 + totalRule3 + totalRule4;

  const outputPayload = {
    timestamp: new Date().toISOString(),
    filesScanned: allFiles.length,
    totalViolations,
    passed: totalViolations === 0,
    rules: {
      rule1_nativeDialogs: {
        totalMatches: totalRule1,
        filesAffected: rule1Violations.length,
        violations: rule1Violations,
      },
      rule2_rawRedHexTokens: {
        totalMatches: totalRule2,
        filesAffected: rule2Violations.length,
        violations: rule2Violations,
      },
      rule3_missingDarkMode: {
        filesAffected: totalRule3,
        violations: rule3Violations,
      },
      rule4_emptyInlineHandlers: {
        totalMatches: totalRule4,
        filesAffected: rule4Violations.length,
        violations: rule4Violations,
      },
    },
  };

  if (jsonOutput) {
    console.log(JSON.stringify(outputPayload, null, 2));
    process.exit(totalViolations === 0 ? 0 : 1);
  }

  // Formatted Console Output
  console.log('\n===============================================================');
  console.log('       PANDAMARKET SELLER DASHBOARD ANTI-PATTERN DETECTOR      ');
  console.log('===============================================================\n');
  console.log(`Scanned ${allFiles.length} TSX files in Seller Dashboard & Components.`);
  console.log('---------------------------------------------------------------\n');

  console.log(`[Rule 1] Native Browser Dialogs (window.alert/confirm/prompt):`);
  if (totalRule1 === 0) {
    console.log('  \x1b[32m✓ 0 violations (Clean)\x1b[0m');
  } else {
    console.log(`  \x1b[31m✗ ${totalRule1} violation(s) found across ${rule1Violations.length} file(s):\x1b[0m`);
    for (const v of rule1Violations) {
      console.log(`    - \x1b[33m${v.file}\x1b[0m`);
      for (const m of v.matches) {
        console.log(`        Line ${m.line}: ${m.snippet}`);
      }
    }
  }
  console.log('');

  console.log(`[Rule 2] Raw Red Hex Color Tokens (${TARGET_RED_HEXES.join(', ')}):`);
  if (totalRule2 === 0) {
    console.log('  \x1b[32m✓ 0 violations (Clean)\x1b[0m');
  } else {
    console.log(`  \x1b[31m✗ ${totalRule2} occurrence(s) found across ${rule2Violations.length} file(s):\x1b[0m`);
    for (const v of rule2Violations) {
      console.log(`    - \x1b[33m${v.file}\x1b[0m (${v.count} token(s))`);
      for (const m of v.matches.slice(0, 5)) {
        console.log(`        Line ${m.line} [${m.token}]: ${m.snippet.slice(0, 90)}`);
      }
      if (v.matches.length > 5) {
        console.log(`        ... and ${v.matches.length - 5} more`);
      }
    }
  }
  console.log('');

  console.log(`[Rule 3] Dark Mode Class Pairing (missingDarkMode):`);
  if (totalRule3 === 0) {
    console.log('  \x1b[32m✓ 0 violations (Clean)\x1b[0m');
  } else {
    console.log(`  \x1b[31m✗ ${totalRule3} surface(s) with missing dark mode pairing:\x1b[0m`);
    for (const v of rule3Violations) {
      console.log(`    - \x1b[33m${v.file}\x1b[0m (dark: count = ${v.darkCount}, ${v.details.length} issue(s))`);
    }
  }
  console.log('');

  console.log(`[Rule 4] Empty Inline Event Handlers (onClick={() => {}}):`);
  if (totalRule4 === 0) {
    console.log('  \x1b[32m✓ 0 violations (Clean)\x1b[0m');
  } else {
    console.log(`  \x1b[31m✗ ${totalRule4} violation(s) found across ${rule4Violations.length} file(s):\x1b[0m`);
    for (const v of rule4Violations) {
      console.log(`    - \x1b[33m${v.file}\x1b[0m`);
      for (const m of v.matches) {
        console.log(`        Line ${m.line}: ${m.snippet}`);
      }
    }
  }
  console.log('');

  console.log('===============================================================');
  if (totalViolations === 0) {
    console.log(' \x1b[32mRESULT: ALL CHECKS PASSED (0 ANTI-PATTERNS DETECTED)\x1b[0m');
  } else {
    console.log(` \x1b[31mRESULT: ${totalViolations} TOTAL VIOLATIONS DETECTED\x1b[0m`);
  }
  console.log('===============================================================\n');

  process.exit(totalViolations === 0 ? 0 : 1);
}

runDetector();
