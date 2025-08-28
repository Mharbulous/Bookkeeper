# File Relocator Agent Instructions

## Core Purpose
This agent is specialized for moving single files from one location to another and updating all references throughout the codebase. It is designed for large refactoring jobs where many files need to be moved one at a time to keep context windows small and maintain accuracy.

## Key Operating Principles

### Single File Focus
- Handle only ONE file relocation per invocation
- Even when given a list of multiple files, process only the first file
- Keep context windows small for maximum accuracy

### Complete Reference Updates
- Search and update ALL references to the moved file throughout the codebase
- Include import statements, require() calls, file path references
- Update documentation that references the file path
- Check configuration files that might reference the file

### Legacy Code Handling

**CRITICAL: Do not immediately remove legacy/orphaned code**

When encountering components or composables that appear to be:
- **Legacy code**: Outdated implementations that may have been replaced
- **Orphaned code**: Components/files with no apparent references or usage
- **Dead code**: Unused functions, exports, or entire files

**Instead of removing them:**

1. **Log the finding** in `docs/plans/2. TODOs/LegacyCode.md`
2. **Include detailed notes:**
   - What the code appeared to do (purpose/functionality)
   - Why it seems to be legacy/orphaned (no references found, replaced by newer implementation, etc.)
   - File path and key components/exports
   - Suggested approach for safe removal (testing steps, dependency checks, etc.)
   - Any potential risks or considerations

3. **Do NOT attempt removal** at this time - focus on the file relocation task

**Example log entry format:**
```markdown
## [File Path] - [Date Found]
**Status**: Legacy/Orphaned/Dead Code
**Purpose**: [What the code did]
**Evidence**: [Why it appears unused - no imports, replaced by X, etc.]
**Safe Removal Notes**: [Steps to safely remove - check for dynamic imports, test thoroughly, etc.]
**Risk Level**: [Low/Medium/High] - [Brief reasoning]
```

### Verification Steps
1. Verify the source file exists at the specified location
2. Create the destination directory if it doesn't exist
3. Move the file to the new location
4. Search for all references using appropriate search tools
5. Update each reference found
6. Verify the application still builds and runs correctly
7. Run tests if applicable

### Search Strategy
- Use comprehensive search patterns including:
  - Exact filename matches
  - Relative path imports
  - Absolute path references
  - Dynamic imports
  - File extensions and without extensions
  - Both forward and backward slashes (for cross-platform compatibility)

### Error Handling
- If file doesn't exist at source, report error and stop
- If destination already exists, confirm overwrite or suggest alternative
- If references cannot be automatically updated, provide manual update instructions
- Rollback changes if critical errors occur during the process

## Success Criteria
- Source file successfully moved to destination
- All code references updated and functional
- No broken imports or missing file errors
- Application builds and runs without file-related errors
- All legacy code findings properly logged for future cleanup