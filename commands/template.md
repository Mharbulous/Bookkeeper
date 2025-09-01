# Claude Code Custom Command Template
## 2025 Best Practices Guide

This template provides comprehensive guidance for creating effective Claude Code custom commands following current best practices from the developer community and official Anthropic recommendations.

## Quick Reference

### Directory Structure
```
.claude/commands/           # Project-specific (shared with team)
├── git/
│   ├── commit.md          # Becomes /git:commit  
│   └── create-pr.md       # Becomes /git:create-pr
├── testing/
│   ├── run-suite.md       # Becomes /testing:run-suite
│   └── generate-tests.md  # Becomes /testing:generate-tests
└── analysis/
    ├── code-review.md     # Becomes /analysis:code-review
    └── performance.md     # Becomes /analysis:performance

~/.claude/commands/         # Personal (available everywhere)
├── daily-standup.md       # Becomes /daily-standup
└── time-tracker.md        # Becomes /time-tracker
```

### Naming Conventions
- ✅ Use `kebab-case` for filenames
- ✅ Use descriptive, action-oriented names
- ✅ Organize by category using subdirectories
- ❌ Avoid generic names like `helper.md` or `utils.md`

## Command Template Structure

### Basic Command Template
```markdown
---
# Frontmatter (Optional but Recommended)
description: Brief description of what this command does
argument-hint: [required-arg] [optional-arg]
allowed-tools: Bash(*), Read(*), Write(*)
model: claude-3-5-sonnet-20241022
---

# Command Title

Brief explanation of the command's purpose and when to use it.

## Instructions

1. **Step 1**: Clear, actionable instruction
   - Use specific language
   - Include expected outcomes

2. **Step 2**: Next logical step
   - Reference files using @filename syntax
   - Execute bash commands using !command syntax

3. **Step 3**: Final steps and verification
   - Always include success criteria
   - Specify expected outputs

## Parameters
- `$ARGUMENTS`: General description of all arguments
- `$1`: First specific parameter description
- `$2`: Second specific parameter description

## Usage Examples
```
/command-name arg1 arg2
/command-name "argument with spaces"
```

## Expected Output
Describe what the user should expect to see when the command completes successfully.
```

### Advanced Command Template with Integration Features
```markdown
---
description: Advanced command with pre-execution and file integration
argument-hint: [github-issue-number] [priority-level]
allowed-tools: Bash(git:*), Bash(gh:*), Read(*), Write(*)
model: claude-3-5-sonnet-20241022
---

# Advanced Integration Command

This command demonstrates advanced features including pre-execution bash commands and file content integration.

## Pre-execution Setup
!git status
!gh auth status

## Main Instructions

1. **Analyze Issue**: Review GitHub issue #$1
   - Priority level: $2 (default: medium)
   - Pull current issue details: `!gh issue view $1`

2. **Review Relevant Files**: 
   - Check project configuration: @package.json
   - Review main application: @src/main.js
   - Include recent changes: @CHANGELOG.md

3. **Implementation Strategy**:
   - Create feature branch: `git checkout -b fix/issue-$1`
   - Follow TDD approach with test creation first
   - Implement solution with incremental commits

4. **Quality Assurance**:
   - Run test suite: `!npm run test`
   - Check linting: `!npm run lint`
   - Verify build: `!npm run build`

## Success Criteria
- [ ] All tests pass
- [ ] No linting errors
- [ ] Issue requirements fully addressed
- [ ] Code follows project conventions

## Integration Points
- **GitHub**: Automatically fetches issue details
- **Git**: Creates appropriate branch structure
- **npm**: Runs quality checks
- **Project Files**: Incorporates existing patterns
```

## Frontmatter Options Reference

### Essential Frontmatter Fields
```yaml
---
# Core fields (recommended for all commands)
description: "One-line description of the command's purpose"
argument-hint: "[required] [optional] <choices>"

# Tool permissions (security best practice)
allowed-tools: 
  - "Bash(git:*)"           # Allow git commands only
  - "Bash(npm:*)"           # Allow npm commands only  
  - "Read(*)"               # Allow reading any files
  - "Write(src/**/*)"       # Allow writing to src directory only
  - "*"                     # Allow all tools (use cautiously)

# Model selection
model: claude-3-5-sonnet-20241022    # For complex tasks
model: claude-3-5-haiku-20241022     # For simple, fast tasks

# Advanced options
thinking-mode: true        # Enable reasoning display
namespace: project         # Custom namespace (rare usage)
---
```

### Argument Hint Patterns
```yaml
argument-hint: "[required-param]"
argument-hint: "[required] [optional]"  
argument-hint: "[file-path] [--option]"
argument-hint: "<high|medium|low> [description]"
argument-hint: "[issue-number] [branch-name=auto]"
```

## Command Categories & Examples

### 1. Git & Version Control Commands
```markdown
# .claude/commands/git/smart-commit.md
---
description: Create semantic commit with automatic type detection
argument-hint: "[commit-message]"
allowed-tools: Bash(git:*)
---

# Smart Commit

Analyze staged changes and create a semantic commit with appropriate type prefix.

!git status
!git diff --cached

1. **Analyze Changes**: Determine commit type based on staged files
   - feat: new features
   - fix: bug fixes  
   - docs: documentation changes
   - style: formatting changes
   - refactor: code restructuring
   - test: test additions/updates

2. **Create Commit**: Format as `type(scope): $ARGUMENTS`
3. **Verify**: Show final commit message before executing
```

### 2. Testing & Quality Assurance
```markdown
# .claude/commands/testing/comprehensive-test.md
---
description: Run full test suite with coverage and quality checks
argument-hint: "[test-pattern]"
allowed-tools: Bash(*), Read(package.json)
---

# Comprehensive Testing

Execute complete quality assurance workflow.

@package.json

1. **Test Execution**: Run tests matching pattern "$1"
   - Unit tests: `!npm run test $1`  
   - Integration tests: `!npm run test:integration`
   - E2E tests: `!npm run test:e2e`

2. **Quality Checks**:
   - Linting: `!npm run lint`
   - Type checking: `!npm run type-check`
   - Coverage: `!npm run test:coverage`

3. **Report Generation**: Summarize results and coverage metrics
```

### 3. Code Analysis & Review
```markdown  
# .claude/commands/analysis/security-audit.md
---
description: Perform security analysis and vulnerability assessment
argument-hint: "[focus-area]"
allowed-tools: Bash(*), Read(*), Grep(*)
model: claude-3-5-sonnet-20241022
---

# Security Audit

Comprehensive security analysis focusing on $1 (default: all areas).

1. **Dependency Analysis**:
   - Check for known vulnerabilities: `!npm audit`
   - Review package.json for suspicious dependencies: @package.json

2. **Code Pattern Analysis**:
   - Search for security anti-patterns
   - Check for hardcoded secrets
   - Validate input sanitization

3. **Configuration Review**:
   - Environment variable usage: @.env.example
   - Security headers and CORS settings
   - Authentication/authorization patterns

4. **Generate Report**: Create actionable security recommendations
```

### 4. Project Management & Documentation
```markdown
# .claude/commands/project/create-feature-plan.md
---
description: Create comprehensive feature implementation plan
argument-hint: "[feature-name] [complexity-level]"
allowed-tools: Write(*), Read(*)
---

# Feature Planning

Create detailed implementation plan for feature: $1 (complexity: $2)

@docs/ARCHITECTURE.md
@package.json

1. **Requirements Analysis**:
   - Break down feature into user stories
   - Identify technical dependencies
   - Estimate implementation time

2. **Technical Design**:
   - Component architecture planning
   - Data flow design
   - Integration points identification

3. **Implementation Roadmap**:
   - Phase 1: Core functionality
   - Phase 2: UI/UX implementation
   - Phase 3: Testing and optimization

4. **Documentation Creation**:
   - Create feature specification document
   - Update architecture documentation
   - Generate task breakdown
```

## Best Practices Summary

### ✅ DO:
- Use descriptive, action-oriented command names
- Include clear argument hints and usage examples  
- Organize commands by category using subdirectories
- Specify allowed-tools for security
- Use pre-execution commands (`!`) for setup
- Include file content (`@`) for context
- Follow test-driven development principles
- Provide clear success criteria
- Use semantic versioning for command updates
- Share project-specific commands via `.claude/commands/`

### ❌ DON'T:
- Create overly generic commands without clear purpose
- Use confusing or abbreviated command names
- Skip argument validation or error handling
- Allow unrestricted tool access without justification
- Create commands that perform destructive actions without confirmation
- Duplicate functionality across multiple commands
- Skip documentation or usage examples
- Create commands that require manual intervention mid-execution

## Integration with Development Workflow

### Team Collaboration
```bash
# Project commands are automatically shared
git add .claude/commands/
git commit -m "feat: add custom development commands"
git push

# Team members get commands automatically
git pull  # Commands now available to entire team
```

### CI/CD Integration  
```markdown
# .claude/commands/deployment/release-prep.md
---
description: Prepare release with automated checks and documentation
allowed-tools: Bash(*), Write(*)
---

# Release Preparation

!git status
!npm run test:ci
!npm run build

1. **Quality Gates**: Ensure all checks pass
2. **Version Bump**: Update package.json and CHANGELOG.md  
3. **Documentation**: Update README and API docs
4. **Tag Creation**: Create release tag with notes
```

### Hook Integration
Commands work seamlessly with Claude Code hooks for automated workflows:
```json
{
  "hooks": {
    "PreToolUse": {
      "command": "/project:validate-changes",
      "enabled": true
    }
  }
}
```

## Testing Your Commands

### Manual Testing Checklist
- [ ] Command executes without errors
- [ ] Arguments are properly parsed and used
- [ ] Pre-execution commands work correctly  
- [ ] File inclusions load expected content
- [ ] Output matches documented expectations
- [ ] Error cases are handled gracefully

### Automated Command Testing
Consider creating test commands that validate your custom commands:
```markdown
# .claude/commands/meta/test-commands.md  
---
description: Test custom commands functionality
---
# Command Testing Suite

Systematically test all custom commands for functionality and error handling.
```

---

## Contributing to Command Ecosystem

Share useful commands with the community:
- [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) - Community command collection
- [Claude Command Suite](https://github.com/qdhenry/Claude-Command-Suite) - Professional command library

## Version History
- v1.0.0 (2025-01-XX): Initial template based on 2025 best practices
- Include version info when updating commands for team coordination

---

*This template follows 2025 best practices from the Claude Code developer community, official Anthropic documentation, and real-world usage patterns.*