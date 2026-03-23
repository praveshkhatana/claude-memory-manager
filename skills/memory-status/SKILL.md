---
name: memory-status
description: This skill should be used when user asks to "check memory status", "show memory statistics", "database status", "how much data stored", "memory health check", "list all conversations", "summary of indexed data", or needs to inspect the memory database state and contents.
version: 0.1.0
---

# Memory Status

Check the current state of the memory database including conversation counts, storage statistics, indexing status, and system health.

## Quick Status Check

Get an overview of the memory system:

```bash
# Display quick status summary
sqlite3 ~/.claude/memory/memory.db "
SELECT
  'Total Conversations' as metric,
  COUNT(*) as value
FROM conversations

UNION ALL

SELECT
  'Total Summaries' as metric,
  COUNT(*) as value
FROM conversations
WHERE summary IS NOT NULL

UNION ALL

SELECT
  'With Embeddings' as metric,
  COUNT(*) as value
FROM conversations
WHERE embedding IS NOT NULL

UNION ALL

SELECT
  'Database Size (MB)' as metric,
  ROUND(page_count * page_size / 1024.0 / 1024.0, 2) as value
FROM pragma_page_count(), pragma_page_size();
"
```

## Detailed Statistics

### Conversation Statistics

View conversation distribution by project:

```bash
sqlite3 ~/.claude/memory/memory.db "
SELECT
  COALESCE(project, 'global') as project,
  COUNT(*) as total,
  COUNT(CASE WHEN summary IS NOT NULL THEN 1 END) as with_summary,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as indexed,
  MIN(timestamp) as first_conversation,
  MAX(timestamp) as last_conversation
FROM conversations
GROUP BY project
ORDER BY total DESC;
"
```

### Recent Activity

Check recent indexing activity:

```bash
sqlite3 ~/.claude/memory/memory.db "
SELECT
  project,
  COUNT(*) as count,
  MIN(timestamp) as oldest,
  MAX(timestamp) as newest
FROM conversations
WHERE timestamp > datetime('now', '-7 days')
GROUP BY project
ORDER BY newest DESC;
"
```

## Storage Analysis

### Table Sizes

Check storage usage per table:

```bash
sqlite3 ~/.claude/memory/memory.db "
SELECT
  name as table_name,
  (SELECT COUNT(*) FROM conversations WHERE name='conversations') as row_count,
  ROUND(pgsize * COUNT(*) / 1024.0 / 1024.0, 2) as estimated_size_mb
FROM sqlite_master
WHERE type='table' AND name IN ('conversations', 'tags', 'tag_relations')
ORDER BY estimated_size_mb DESC;
"
```

### Token Usage Summary

Estimate stored token usage:

```bash
sqlite3 ~/.claude/memory/memory.db "
SELECT
  ROUND(AVG(summary_length), 0) as avg_summary_tokens,
  ROUND(SUM(summary_length) / 1024.0, 2) as total_summary_tokens_k,
  ROUND(SUM(user_message_length + assistant_message_length) / 1024.0, 2) as total_full_tokens_k
FROM (
  SELECT
    LENGTH(summary) as summary_length,
    LENGTH(user_message) as user_message_length,
    LENGTH(assistant_message) as assistant_message_length
  FROM conversations
);
"
```

## Index Health

### Indexing Coverage

Check what percentage of conversations have embeddings:

```bash
sqlite3 ~/.claude/memory/memory.db "
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as indexed,
  ROUND(COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as coverage_percent
FROM conversations;
"
```

### Missing Embeddings

Find conversations that lack embeddings:

```bash
sqlite3 ~/.claude/memory/memory.db "
SELECT
  id,
  project,
  datetime(timestamp, 'localtime') as created,
  CASE
    WHEN summary IS NULL THEN 'No summary'
    WHEN embedding IS NULL THEN 'No embedding'
    ELSE 'Missing both'
  END as issue
FROM conversations
WHERE embedding IS NULL
ORDER BY timestamp DESC
LIMIT 10;
"
```

## Tag Statistics

### Tag Usage

View most frequently used tags:

```bash
sqlite3 ~/.claude/memory/memory.db "
SELECT
  t.name as tag,
  COUNT(tr.conversation_id) as usage_count
FROM tags t
LEFT JOIN tag_relations tr ON t.id = tr.tag_id
GROUP BY t.id
ORDER BY usage_count DESC
LIMIT 20;
"
```

### Untagged Conversations

Count conversations without tags:

```bash
sqlite3 ~/.claude/memory/memory.db "
SELECT
  COUNT(*) as untagged_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM conversations), 2) as percentage
FROM conversations c
WHERE NOT EXISTS (
  SELECT 1 FROM tag_relations tr
  WHERE tr.conversation_id = c.id
);
"
```

## System Health

### Database Integrity

Verify database integrity:

```bash
sqlite3 ~/.claude/memory/memory.db "PRAGMA integrity_check;"
```

### Vector Index Status

Check if vector similarity index is available:

```bash
sqlite3 ~/.claude/memory/memory.db "
SELECT
  name,
  tbl_name
FROM sqlite_master
WHERE type='index' AND sql LIKE '%distance%' OR sql LIKE '%vector%';
"
```

### Configuration Check

View current configuration:

```bash
sqlite3 ~/.claude/memory/memory.db "
SELECT
  key,
  value
FROM config
ORDER BY key;
"
```

## Export Status Report

Generate a comprehensive status report:

```bash
sqlite3 ~/.claude/memory/memory.db << 'EOF' | tee memory-status-report.md
.mode box
.headers on

-- Overall Statistics
SELECT '--- OVERALL STATISTICS ---' as section;
SELECT
  'Total Conversations' as metric,
  COUNT(*) as value
FROM conversations

UNION ALL

SELECT
  'Total Summaries' as metric,
  COUNT(*) as value
FROM conversations
WHERE summary IS NOT NULL

UNION ALL

SELECT
  'With Embeddings' as metric,
  COUNT(*) as value
FROM conversations
WHERE embedding IS NOT NULL

UNION ALL

SELECT
  'Unique Tags' as metric,
  (SELECT COUNT(*) FROM tags) as value;

-- Project Breakdown
SELECT '--- PROJECT BREAKDOWN ---' as section;
SELECT
  project,
  COUNT(*) as total,
  COUNT(CASE WHEN summary IS NOT NULL THEN 1 END) as summaries,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as indexed
FROM conversations
GROUP BY project
ORDER BY total DESC;

-- Recent Activity
SELECT '--- RECENT ACTIVITY (7 DAYS) ---' as section;
SELECT
  project,
  COUNT(*) as new_conversations,
  MIN(timestamp) as oldest,
  MAX(timestamp) as newest
FROM conversations
WHERE timestamp > datetime('now', '-7 days')
GROUP BY project;

-- Storage
SELECT '--- STORAGE ---' as section;
SELECT
  'Table Sizes' as info;
SELECT
  name as table,
  (SELECT COUNT(*) FROM conversations WHERE name='conversations') as rows
FROM sqlite_master
WHERE type='table';
EOF
```

## Troubleshooting

### Database Locked

If commands fail with "database is locked":

```bash
# Check for open connections
lsof ~/.claude/memory/memory.db

# Kill blocking processes if needed
kill -9 $(lsof -t ~/.claude/memory/memory.db)
```

### Empty Database

If all counts show zero:

```bash
# Verify database file exists
ls -lh ~/.claude/memory/memory.db

# Check if tables exist
sqlite3 ~/.claude/memory/memory.db ".tables"

# Initialize if needed
cc memory-init
```

### Slow Queries

If queries are slow:

```bash
# Analyze query plan
sqlite3 ~/.claude/memory/memory.db "EXPLAIN QUERY PLAN SELECT * FROM conversations ORDER BY timestamp DESC LIMIT 10;"

# Create missing indexes
sqlite3 ~/.claude/memory/memory.db "CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);"
sqlite3 ~/.claude/memory/memory.db "CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project);"
```

## Best Practices

- Run status check weekly to monitor growth
- Check indexing coverage before relying on semantic search
- Export status report before major operations
- Monitor database size to prevent disk space issues
- Use recent activity to identify active projects
