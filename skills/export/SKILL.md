---
name: export
description: This skill should be used when user asks to "export memory", "backup database", "export conversations", "export to file", "save memory", "download conversations", or needs to export or backup memory database contents for sharing, migration, or archiving purposes.
version: 0.1.0
---

# Export Memory

Export conversation data from the memory database in various formats for backup, sharing, or migration to other systems.

## Database Export

### Full Database Backup

Export complete database to SQL dump:

```bash
backup_database() {
  local backup_file="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF > "${backup_file}"
-- Memory Database Backup
-- Exported: $(date '+%Y-%m-%d %H:%M:%S')
-- Database: ~/.claude/memory/memory.db

BEGIN TRANSACTION;

-- Export schema
.dump

-- Export data
.output "${backup_file}.sql"
SELECT * FROM config;
SELECT * FROM tags;
SELECT * FROM conversations;
SELECT * FROM tag_relations;
SELECT * FROM messages;

COMMIT;
EOF

  # Also copy the binary database
  cp ~/.claude/memory/memory.db "${backup_file}.db"

  echo "Database backed up to ${backup_file}.db and ${backup_file}.sql"
}

backup_database ~/.claude/memory/backup-$(date +%Y%m%d)
```

### Incremental Backup

Export only recent changes:

```bash
incremental_backup() {
  local since_date="$1"
  local output_dir="$2"

  mkdir -p "${output_dir}"

  sqlite3 ~/.claude/memory/memory.db << EOF > "${output_dir}/incremental-${since_date}.sql"
-- Incremental Backup: conversations since ${since_date}
-- Exported: $(date '+%Y-%m-%d %H:%M:%S')

.output "${output_dir}/conversations.sql"
.mode insert conversations
SELECT * FROM conversations WHERE timestamp >= datetime('${since_date}');

.output "${output_dir}/tag_relations.sql"
.mode insert tag_relations
SELECT * FROM tag_relations
WHERE conversation_id IN (
  SELECT id FROM conversations
  WHERE timestamp >= datetime('${since_date}')
);
EOF
}

incremental_backup "2025-01-01" ~/.claude/memory/backups
```

## Conversation Export

### Export to JSON

Export conversations as JSON:

```bash
export_json() {
  local query="${1:-}"
  local output_file="$2"

  sqlite3 ~/.claude/memory/memory.db -json << EOF > "${output_file}"
{
  "export_date": "$(date -Iseconds)",
  "query": "${query}",
  "conversations": [
    $(SELECT json_object(
      'id', id,
      'project', project,
      'timestamp', datetime(timestamp, 'iso'),
      'summary', summary,
      'user_message', user_message,
      'assistant_message', assistant_message,
      'tags', (
        SELECT json_group(t.name)
        FROM tags t
        JOIN tag_relations tr ON t.id = tr.tag_id
        WHERE tr.conversation_id = c.id
      )
    )
    FROM conversations c
    WHERE ${query:-1=1}
    ORDER BY timestamp DESC
    LIMIT 100
  ]
}
EOF
}

export_json "summary LIKE '%bug%'" bugs.json
```

### Export to Markdown

Export conversations as formatted markdown:

```bash
export_markdown() {
  local output_file="$1"
  local limit="${2:-50}"

  sqlite3 ~/.claude/memory/memory.db << EOF > "${output_file}"
# Memory Export
# Exported: $(date '+%Y-%m-%d %H:%M:%S')
# Total Conversations: ${limit}

SELECT ''
FROM (SELECT 1);

-- Project sections
SELECT ''
|| '## ' || COALESCE(project, 'Global')
FROM conversations
WHERE summary IS NOT NULL
GROUP BY project
ORDER BY project;

-- Conversations per project
SELECT ''
|| '### Conversation #' || id
|| ''
|| '**Date:** ' || datetime(timestamp, 'iso')
|| ''
|| '**Summary:**'
|| ''
|| summary
|| ''
|| '**Tags:** ' || (
  SELECT group_concat(t.name, ', ')
  FROM tags t
  JOIN tag_relations tr ON t.id = tr.tag_id
  WHERE tr.conversation_id = conversations.id
) || ''
|| ''
|| '---'
FROM conversations
WHERE summary IS NOT NULL
ORDER BY project, timestamp DESC
LIMIT ${limit};
EOF
}

export_markdown memory-export.md 100
```

### Export to CSV

Export conversation metadata as CSV:

```bash
export_csv() {
  local output_file="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF > "${output_file}"
.mode csv
.headers on

.output "${output_file}"
SELECT
  id,
  project,
  datetime(timestamp, 'iso'),
  substr(summary, 1, 100) as summary_preview,
  CASE
    WHEN embedding IS NOT NULL THEN 'indexed'
    ELSE 'not-indexed'
  END as indexing_status
FROM conversations
ORDER BY timestamp DESC;
EOF
}

export_csv conversations.csv
```

## Filtered Export

### Export by Date Range

Export conversations within time period:

```bash
export_by_date_range() {
  local start_date="$1"
  local end_date="$2"
  local output_file="$3"

  sqlite3 ~/.claude/memory/memory.db -json << EOF > "${output_file}"
{
  "period": "${start_date} to ${end_date}",
  "conversations": [
    $(SELECT json_object(
      'id', id,
      'project', project,
      'timestamp', datetime(timestamp, 'iso'),
      'summary', summary
    )
    FROM conversations
    WHERE date(timestamp) BETWEEN date('${start_date}') AND date('${end_date}')
    ORDER BY timestamp
  ]
}
EOF
}

export_by_date_range "2025-01-01" "2025-12-31" 2025-conversations.json
```

### Export by Project

Export specific project:

```bash
export_by_project() {
  local project="$1"
  local output_dir="$2"

  mkdir -p "${output_dir}"

  # Export JSON
  export_json "project = '${project}'" "${output_dir}/${project}.json"

  # Export Markdown
  sqlite3 ~/.claude/memory/memory.db << EOF > "${output_dir}/${project}.md"
# Project: ${project}

SELECT ''
|| '## Conversation #' || id
|| ''
|| datetime(timestamp, 'iso')
|| ''
|| summary
|| ''
|| '---'
FROM conversations
WHERE project = '${project}'
ORDER BY timestamp DESC;
EOF
}

export_by_project "my-app" ./exports
```

### Export by Tags

Export conversations with specific tags:

```bash
export_by_tags() {
  local tags="$1"  # comma-separated
  local output_file="$2"

  sqlite3 ~/.claude/memory/memory.db -json << EOF > "${output_file}"
{
  "tags": "${tags}",
  "conversations": [
    $(SELECT json_object(
      'id', id,
      'project', project,
      'summary', summary,
      'timestamp', datetime(timestamp, 'iso'),
      'tags', (
        SELECT json_group(t.name)
        FROM tags t
        JOIN tag_relations tr ON t.id = tr.tag_id
        WHERE tr.conversation_id = c.id
      )
    )
    FROM conversations c
    WHERE id IN (
      SELECT DISTINCT conversation_id
      FROM tag_relations
      WHERE tag_id IN (
        SELECT id FROM tags WHERE name IN ('${tags//,/','}')
      )
    )
    ORDER BY timestamp DESC
  ]
}
EOF
}

export_by_tags "bugfix,api" tagged-conversations.json
```

## Special Export Formats

### Export for LLM Consumption

Optimize export for loading into LLM context:

```bash
export_for_llm() {
  local query="$1"
  local output_file="$2"

  sqlite3 ~/.claude/memory/memory.db << EOF > "${output_file}"
# Relevant Context for: ${query}
# Generated: $(date '+%Y-%m-%d')

SELECT ''
|| '# Summary of Conversations'
|| ''
|| Below are relevant summaries from past work. Use these as context:
|| ''
FROM (SELECT 1);

SELECT ''
|| '## ' || COALESCE(project, 'Global') || ' - ' || datetime(timestamp, 'iso')
|| ''
|| summary
|| ''
FROM conversations
WHERE summary IS NOT NULL
  AND (${query:-1=1})
ORDER BY timestamp DESC
LIMIT 20;
EOF
}

export_for_llm "summary LIKE '%authentication%'" llm-context.md
```

### Export Code Snippets

Extract only code from conversations:

```bash
export_code_snippets() {
  local output_file="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF > "${output_file}"
# Code Snippets Export
# Extracted: $(date '+%Y-%m-%d %H:%M:%S')

SELECT ''
|| '## ' || project || COALESCE(project, 'Global') || ' - Conversation #' || id
|| ''
|| datetime(timestamp, 'iso')
|| ''
|| assistant_message
|| ''
|| '---'
FROM conversations
WHERE assistant_message LIKE '%```%'
ORDER BY timestamp DESC
LIMIT 50;
EOF
}

export_code_snippets code-snippets.md
```

### Export Decisions Log

Create decisions-only export:

```bash
export_decisions() {
  local output_file="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF > "${output_file}"
# Decisions Log
# Generated: $(date '+%Y-%m-%d')

SELECT ''
|| '## ' || datetime(timestamp, 'iso')
|| ''
|| '### Context'
|| ''
|| project || COALESCE(project, 'Global')
|| ''
|| '### Summary'
|| ''
|| summary
|| ''
|| '### Key Decisions'
|| ''
FROM conversations
WHERE summary IS NOT NULL
  AND (
    summary LIKE '%decided%'
    OR summary LIKE '%chose%'
    OR summary LIKE '%agreed%'
    OR summary LIKE '%determined%'
  )
ORDER BY timestamp DESC
LIMIT 100;
EOF
}

export_decisions decisions-log.md
```

## Export Validation

### Verify Export

Validate exported data:

```bash
verify_export() {
  local export_file="$1"

  # Check file exists
  if [ ! -f "${export_file}" ]; then
    echo "Error: Export file not found"
    return 1
  fi

  # Get record count
  local count=$(grep -c '"id"' "${export_file}" || echo "0")

  # Get file size
  local size=$(du -h "${export_file}" | cut -f1)

  echo "Export verification:"
  echo "  File: ${export_file}"
  echo "  Size: ${size}"
  echo "  Records: ${count}"

  # Basic JSON validation if JSON file
  if [[ "${export_file}" == *.json ]]; then
    if jq empty "${export_file}" 2>/dev/null; then
      echo "  Status: Valid JSON"
    else
      echo "  Status: Invalid JSON"
    fi
  fi
}

verify_export conversations.json
```

### Compare Export

Compare export against database:

```bash
compare_export() {
  local export_file="$1"

  local db_count=$(sqlite3 ~/.claude/memory/memory.db "SELECT COUNT(*) FROM conversations;")
  local export_count=$(grep -c '"id"' "${export_file}" || echo "0")

  echo "Comparison:"
  echo "  Database records: ${db_count}"
  echo "  Exported records: ${export_count}"

  if [ "${db_count}" -eq "${export_count}" ]; then
    echo "  Status: Match ✓"
  else
    echo "  Status: Mismatch ✗"
    echo "  Difference: $((db_count - export_count)) records"
  fi
}

compare_export conversations.json
```

## Backup Management

### List Backups

Show all available backups:

```bash
list_backups() {
  local backup_dir="${1:-~/.claude/memory/backups}"

  if [ -d "${backup_dir}" ]; then
    echo "Available backups:"
    ls -lh "${backup_dir}"/*.{db,json,sql} 2>/dev/null | \
      awk '{printf "  %s %s %s\n", $5, $6, $9}'
  else
    echo "No backups directory found"
  fi
}

list_backups
```

### Restore Backup

Restore from backup:

```bash
restore_backup() {
  local backup_file="$1"
  local target_db="${2:-~/.claude/memory/memory.db}"

  # Backup current database
  cp "${target_db}" "${target_db}.restore-backup"

  # Restore from backup
  cp "${backup_file}" "${target_db}"

  echo "Restored from ${backup_file}"
  echo "Previous backup saved as ${target_db}.restore-backup"
}

restore_backup ~/.claude/memory/backups/memory-20250101.db
```

### Cleanup Old Backups

Remove old backup files:

```bash
cleanup_backups() {
  local backup_dir="${1:-~/.claude/memory/backups}"
  local keep_days="${2:-30}"

  find "${backup_dir}" -name "*.{db,json,sql}" -mtime +${keep_days} -delete

  echo "Removed backups older than ${keep_days} days"
}

cleanup_backups ~/.claude/memory/backups 30
```

## Best Practices

- Regularly export for backup purposes
- Use appropriate format for intended use case (JSON for data transfer, Markdown for reading)
- Filter exports to include only relevant data
- Verify exports before sharing
- Keep backup rotation (keep recent, archive old)
- Use versioned filenames for historical exports
- Consider encryption for sensitive exports
- Document export format and schema when sharing
