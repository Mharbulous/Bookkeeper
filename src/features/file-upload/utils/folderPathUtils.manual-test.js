/**
 * Test file for folder path pattern recognition
 * Run this in the browser console to validate the logic
 */

import {
  updateFolderPaths,
  identifyFolderPathPattern,
  parseExistingPaths,
  serializePaths,
  normalizePath,
  FOLDER_PATH_PATTERNS
} from './folderPathUtils.js';

/**
 * Test suite for folder path pattern recognition
 */
export function runFolderPathTests() {
  console.log('🧪 Running Folder Path Pattern Tests...\n');

  // Test 1: Extension Pattern
  console.log('Test 1: Extension Pattern');
  console.log('Existing: "/2025", New: "/General Account/2025"');
  let result = updateFolderPaths('/General Account/2025', '/2025');
  console.log('Result:', result);
  console.log('Expected: Extension pattern, folderPaths updated to "/General Account/2025"');
  console.log('✅ Pass:', result.pattern.type === FOLDER_PATH_PATTERNS.EXTENSION && result.folderPaths === '/General Account/2025');
  console.log('');

  // Test 2: Reduction Pattern  
  console.log('Test 2: Reduction Pattern');
  console.log('Existing: "/2025", New: "/"');
  result = updateFolderPaths('/', '/2025');
  console.log('Result:', result);
  console.log('Expected: Reduction pattern, existing path preserved');
  console.log('✅ Pass:', result.pattern.type === FOLDER_PATH_PATTERNS.REDUCTION && result.folderPaths === '/2025');
  console.log('');

  // Test 3: Different Path Pattern
  console.log('Test 3: Different Path Pattern');
  console.log('Existing: "/2025", New: "/Bank Statements"');
  result = updateFolderPaths('/Bank Statements', '/2025');
  console.log('Result:', result);
  console.log('Expected: Different path pattern, both paths saved');
  const expectedMultiple = '/2025|/Bank Statements';
  console.log('✅ Pass:', result.pattern.type === FOLDER_PATH_PATTERNS.DIFFERENT_PATH && result.folderPaths === expectedMultiple);
  console.log('');

  // Test 4: Exact Match Pattern
  console.log('Test 4: Exact Match Pattern');
  console.log('Existing: "/2025", New: "/2025"');
  result = updateFolderPaths('/2025', '/2025');
  console.log('Result:', result);
  console.log('Expected: Exact match pattern, no change');
  console.log('✅ Pass:', result.pattern.type === FOLDER_PATH_PATTERNS.EXACT_MATCH && result.folderPaths === '/2025' && !result.hasChanged);
  console.log('');

  // Test 5: Complex Extension Pattern
  console.log('Test 5: Complex Extension Pattern');
  console.log('Existing: "/Contracts/2025", New: "/Legal/Contracts/2025"');
  result = updateFolderPaths('/Legal/Contracts/2025', '/Contracts/2025');
  console.log('Result:', result);
  console.log('Expected: Extension pattern, path updated');
  console.log('✅ Pass:', result.pattern.type === FOLDER_PATH_PATTERNS.EXTENSION && result.folderPaths === '/Legal/Contracts/2025');
  console.log('');

  // Test 6: Multiple Existing Paths - Add Different
  console.log('Test 6: Multiple Existing Paths - Add Different');
  console.log('Existing: "/2025|/Bank Statements", New: "/Invoices"');
  result = updateFolderPaths('/Invoices', '/2025|/Bank Statements');
  console.log('Result:', result);
  console.log('Expected: Different path pattern, three paths total');
  const expectedThree = '/2025|/Bank Statements|/Invoices';
  console.log('✅ Pass:', result.pattern.type === FOLDER_PATH_PATTERNS.DIFFERENT_PATH && result.folderPaths === expectedThree);
  console.log('');

  // Test 7: Multiple Existing Paths - Extend One
  console.log('Test 7: Multiple Existing Paths - Extend One');
  console.log('Existing: "/2025|/Bank Statements", New: "/Company A/2025"');
  result = updateFolderPaths('/Company A/2025', '/2025|/Bank Statements');
  console.log('Result:', result);
  console.log('Expected: Extension pattern, first path updated');
  const expectedExtended = '/Company A/2025|/Bank Statements';
  console.log('✅ Pass:', result.pattern.type === FOLDER_PATH_PATTERNS.EXTENSION && result.folderPaths === expectedExtended);
  console.log('');

  // Test 8: Empty/Root Path Handling
  console.log('Test 8: Empty/Root Path Handling');
  console.log('Existing: "", New: "/Documents"');
  result = updateFolderPaths('/Documents', '');
  console.log('Result:', result);
  console.log('Expected: Different path pattern (empty existing treated as no paths)');
  console.log('✅ Pass:', result.pattern.type === FOLDER_PATH_PATTERNS.DIFFERENT_PATH && result.folderPaths === '/Documents');
  console.log('');

  // Test Utility Functions
  console.log('🔧 Testing Utility Functions...\n');

  // Test normalizePath
  console.log('Testing normalizePath:');
  console.log('normalize("") =', normalizePath(''));
  console.log('normalize("/") =', normalizePath('/'));
  console.log('normalize("Documents") =', normalizePath('Documents'));
  console.log('normalize("/Documents/") =', normalizePath('/Documents/'));
  console.log('normalize("  /Documents/Contracts  ") =', normalizePath('  /Documents/Contracts  '));
  console.log('');

  // Test parseExistingPaths
  console.log('Testing parseExistingPaths:');
  console.log('parse("") =', parseExistingPaths(''));
  console.log('parse("/2025") =', parseExistingPaths('/2025'));
  console.log('parse("/2025|/Bank Statements") =', parseExistingPaths('/2025|/Bank Statements'));
  console.log('');

  // Test serializePaths
  console.log('Testing serializePaths:');
  console.log('serialize(["/2025", "/Bank Statements"]) =', serializePaths(['/2025', '/Bank Statements']));
  console.log('serialize([]) =', serializePaths([]));
  console.log('');

  console.log('🎉 All folder path pattern tests completed!');
  return true;
}

// Export for use in browser console or other test environments
window.runFolderPathTests = runFolderPathTests;