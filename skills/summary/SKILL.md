---
name: summary
description: This skill should be used when user asks to "generate summary", "summarize conversation", "create conversation summary", "update summary", "extract key points", "condense context", or needs to generate or manage conversation summaries for the memory database.
version: 0.1.0
---

# Generate Summary

Create concise conversation summaries that capture essential context, decisions, and outcomes for efficient memory storage and retrieval.

## Summary Generation

### Basic Summary

Generate a brief overview of a conversation:

```bash
# From conversation file
generate_summary() {
  local input_file="$1"
  local output_summary="$2"

  # Extract key information
  grep -E "^## |^# |^Task:|^Decision:|^Outcome:" "${input_file}" | \
    head -20 > "${output_summary}"
}

generate_summary conversation.md summary.txt
```

### Enhanced Summary

Generate structured summary with metadata:

```bash
enhanced_summary() {
  local conversation_file="$1"

  cat << 'EOF'
# Conversation Summary

## Context
- Project: $(grep -oP '(?<=Project: ).*' "${conversation_file}" | head -1)
- Date: $(date '+%Y-%m-%d')
- Topic: $(head -5 "${conversation_file}" | grep -oP '(?<=^## ).*' | head -1)

## Key Points
$(grep -E "^## |^\- " "${conversation_file}" | head -15)

## Decisions Made
$(grep -E "^Decision:|=> " "${conversation_file}" | head -10)

## Action Items
$(grep -E "^\[ \]|^TODO:|^- \[ ]" "${conversation_file}" | head -10)

## Outcome
$(tail -10 "${conversation_file}" | grep -E "Result:|Complete:|Fixed:")
EOF
}

enhanced_summary conversation.md > summary.md
```

## Summary Templates

### Bug Fix Summary

```bash
bugfix_summary() {
  local bug="$1"
  local solution="$2"
  local files="${3}"

  cat << EOF
# Bug Fix: ${bug}

## Issue
${bug}

## Root Cause
$(git log --all --source --all --format=%s -S "${files}" | head -5)

## Solution Applied
${solution}

## Files Modified
${files}

## Testing Performed
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual verification

## Resolution
Bug fixed and merged to $(git rev-parse --abbrev-ref HEAD)
EOF
}
```

### Feature Implementation Summary

```bash
feature_summary() {
  local feature_name="$1"
  local description="$2"

  cat << EOF
# Feature: ${feature_name}

## Overview
${description}

## Implementation Details
$(git log --oneline -20 | grep -i "${feature_name}")

## Key Components
$(git diff-tree --no-commit-id --name-only -r HEAD | grep -E '\.(ts|tsx|js|py)$')

## Decisions
- Architecture: $(git log --format=%B -1 | grep -A5 "Architecture")
- Dependencies: $(git diff HEAD~1 package.json 2>/dev/null || echo "None")

## Testing
- Unit test coverage: $(npm test -- --coverage 2>/dev/null | grep -oP '\d+(?=%)' || echo "N/A")

## Next Steps
- [ ] Code review
- [ ] Documentation update
- [ ] Release notes
EOF
}
```

## Store Summary in Database

### Insert New Summary

```bash
store_summary() {
  local conversation_id="$1"
  local summary_text="$2"

  sqlite3 ~/.claude/memory/memory.db << EOF
UPDATE conversations
SET summary = '${summary_text}',
    updated_at = datetime('now')
WHERE id = ${conversation_id};
EOF
}
```

### Bulk Generate Summaries

Generate summaries for conversations missing them:

```bash
generate_missing_summaries() {
  sqlite3 ~/.claude/memory/memory.db << 'EOF'
.mode box
.headers on

SELECT
  id,
  substr(user_message, 1, 50) || '...' as context
FROM conversations
WHERE summary IS NULL
LIMIT 10;
EOF
}

# For each result, generate and store summary
for id in $(sqlite3 ~/.claude/memory/memory.db "SELECT id FROM conversations WHERE summary IS NULL LIMIT 10;"); do
  # Generate summary from conversation
  summary=$(sqlite3 ~/.claude/memory/memory.db "
    SELECT 'Summary of conversation #' || id || ' covering: ' ||
           substr(user_message, 1, 100)
    FROM conversations
    WHERE id = ${id};
  ")

  # Store summary
  store_summary "$id" "$summary"
done
```

## Summary Quality

### Validate Summary Length

Check summary length is appropriate:

```bash
validate_summary_length() {
  local min_words="${1:-20}"
  local max_words="${2:-500}"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box

SELECT
  id,
  LENGTH(summary) as char_count,
  LENGTH(summary) - LENGTH(REPLACE(summary, ' ', '')) + 1 as word_count
FROM conversations
WHERE summary IS NOT NULL
HAVING word_count < ${min_words} OR word_count > ${max_words}
LIMIT 20;
EOF
}
```

### Check Summary Coverage

Monitor summary generation progress:

```bash
summary_coverage() {
  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  'Summary Coverage' as metric,
  ROUND(COUNT(CASE WHEN summary IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) || ' percent as value
FROM conversations;

SELECT
  'Total Summaries' as metric,
  COUNT(*) as value
FROM conversations
WHERE summary IS NOT NULL;

SELECT
  'Missing Summaries' as metric,
  COUNT(*) as value
FROM conversations
WHERE summary IS NULL;
EOF
}
```

## Extractive Summarization

### Extract Key Messages

Pull most important messages:

```bash
extract_key_messages() {
  local conversation_id="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  CASE role
    WHEN 'user' THEN 'Q:'
    WHEN 'assistant' THEN 'A:'
  END as role,
  substr(content, 1, 150) || '...' as content
FROM messages
WHERE conversation_id = ${conversation_id}
  AND (
    content LIKE '%error%'
    OR content LIKE '%fix%'
    OR content LIKE '%implement%'
    OR content LIKE '%decision%'
  )
ORDER BY created_at
LIMIT 10;
EOF
}
```

### Extract Code Blocks

Find code snippets in conversation:

```bash
extract_code_blocks() {
  local conversation_id="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box

SELECT
  CASE
    WHEN content LIKE '%```typescript%' THEN 'TypeScript'
    WHEN content LIKE '%```python%' THEN 'Python'
    WHEN content LIKE '%```bash%' THEN 'Bash'
    ELSE 'Unknown'
  END as language,
  substr(content, 1, 200) || '...' as snippet
FROM messages
WHERE conversation_id = ${conversation_id}
  AND content LIKE '%```%'
LIMIT 5;
EOF
}
```

## Summary Optimization

### Compress Long Summaries

Reduce summary size while preserving key info:

```bash
compress_summary() {
  local conversation_id="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
UPDATE conversations
SET summary = (
  SELECT
    'Context: ' || substr(user_message, 1, 80) || '\n' ||
    'Decision: ' || substr(
      REGEXPEXTRACT(assistant_message, '(decided|chose|implemented) [^.]+.'),
      1, 80
    ) || '\n' ||
    'Result: ' || substr(
      REGEXPEXTRACT(assistant_message, '(fixed|complete|done)[^.]+.'),
      1, 60
    )
  FROM conversations
  WHERE id = ${conversation_id}
)
WHERE id = ${conversation_id}
AND LENGTH(summary) > 500;
EOF
}
```

### Tag Summaries

Add relevant tags based on summary content:

```bash
auto_tag_summary() {
  local conversation_id="$1"

  # Detect common patterns and create tags
  sqlite3 ~/.claude/memory/memory.db << EOF
WITH tags_to_add AS (
  SELECT DISTINCT
    CASE
      WHEN summary LIKE '%bug%' THEN 'bugfix'
      WHEN summary LIKE '%feature%' THEN 'feature'
      WHEN summary LIKE '%deploy%' THEN 'deployment'
      WHEN summary LIKE '%test%' THEN 'testing'
      WHEN summary LIKE '%refactor%' THEN 'refactoring'
      WHEN summary LIKE '%api%' THEN 'api'
      WHEN summary LIKE '%auth%' THEN 'authentication'
      WHEN summary LIKE '%db%' THEN 'database'
      WHEN summary LIKE '%perf%' THEN 'performance'
      WHEN summary LIKE '%sec%' THEN 'security'
    END as tag_name
  FROM conversations
  WHERE id = ${conversation_id}
)
INSERT OR IGNORE INTO tags (name)
SELECT tag_name FROM tags_to_add WHERE tag_name IS NOT NULL;
EOF
}
```

## Best Practices

- Keep summaries concise (20-200 words ideal)
- Capture decisions, not all conversation details
- Include context (project, topic, date)
- Structure summaries with clear sections
- Use extractive approaches for code-heavy conversations
- Compress summaries that exceed length limits
- Auto-tag summaries for better searchability
- Regularly generate summaries for new conversations
