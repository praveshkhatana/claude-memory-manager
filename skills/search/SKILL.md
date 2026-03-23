---
name: search
description: This skill should be used when user asks to "search memory", "find conversations", "look up past discussions", "semantic search", "search for something", "find relevant context", "search database", "query memory", or needs to search through indexed conversation history for relevant information.
version: 0.1.0
---

# Search Memory

Query the conversation memory using semantic search (vector similarity) or text-based search (keyword matching) to find relevant past conversations and contexts.

## Quick Search

Perform a simple semantic search:

```bash
# Natural language query
sqlite3 ~/.claude/memory/memory.db << 'EOF'
.mode box
.headers on

SELECT
  id,
  project,
  substr(summary, 1, 100) || '...' as preview,
  datetime(timestamp, 'localtime') as date
FROM conversations
WHERE embedding IS NOT NULL
  AND vec_distance(embedding, (SELECT embedding FROM conversations LIMIT 1)) < 0.5
ORDER BY vec_distance(embedding, (SELECT embedding FROM conversations LIMIT 1)) ASC
LIMIT 10;
EOF
```

## Semantic Search

### Vector Similarity Search

Find conversations by semantic meaning using embeddings:

```bash
search_memory() {
  local query="$1"
  local limit="${2:-10}"

  # Query the database with similarity search
  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  c.id,
  c.project,
  substr(c.summary, 1, 150) || '...' as summary,
  datetime(c.timestamp, 'localtime') as date,
  ROUND(vec_distance(c.embedding, (SELECT embedding FROM conversations LIMIT 1)), 3) as similarity
FROM conversations c
WHERE c.embedding IS NOT NULL
ORDER BY vec_distance(c.embedding, (SELECT embedding FROM conversations LIMIT 1)) ASC
LIMIT ${limit};
EOF
}

# Usage
search_memory "how to implement authentication" 5
```

### With Full Context

Load full conversation context for matched results:

```bash
search_with_context() {
  local query="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  c.id,
  c.project,
  c.user_message,
  c.assistant_message,
  datetime(c.timestamp, 'localtime') as date
FROM conversations c
WHERE c.embedding IS NOT NULL
ORDER BY vec_distance(c.embedding, (SELECT embedding FROM conversations LIMIT 1)) ASC
LIMIT 3;
EOF
}

search_with_context "database migration issues"
```

## Text-Based Search

### Keyword Search

Search for specific terms in summaries and messages:

```bash
text_search() {
  local query="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  id,
  project,
  substr(summary, 1, 120) || '...' as preview,
  datetime(timestamp, 'localtime') as date
FROM conversations
WHERE summary LIKE "%${query}%"
   OR user_message LIKE "%${query}%"
   OR assistant_message LIKE "%${query}%"
ORDER BY timestamp DESC
LIMIT 10;
EOF
}

text_search "authentication"
```

### Regex Pattern Search

Search using regular expressions:

```bash
regex_search() {
  local pattern="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  id,
  project,
  substr(summary, 1, 100) || '...' as match
FROM conversations
WHERE summary REGEXP '${pattern}'
   OR user_message REGEXP '${pattern}'
ORDER BY timestamp DESC
LIMIT 10;
EOF
}

regex_search "(error|exception|bug)"
```

## Filtered Search

### By Project

Search within specific project:

```bash
project_search() {
  local project="$1"
  local query="$2"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  id,
  substr(summary, 1, 120) || '...' as summary,
  datetime(timestamp, 'localtime') as date
FROM conversations
WHERE project = '${project}'
  AND summary LIKE "%${query}%"
ORDER BY timestamp DESC
LIMIT 10;
EOF
}

project_search "my-project" "API design"
```

### By Date Range

Search within time period:

```bash
date_range_search() {
  local start_date="$1"
  local query="$2"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  id,
  project,
  substr(summary, 1, 100) || '...' as summary,
  datetime(timestamp, 'localtime') as date
FROM conversations
WHERE date(timestamp) >= date('${start_date}')
  AND summary LIKE "%${query}%"
ORDER BY timestamp DESC
LIMIT 10;
EOF
}

date_range_search "2025-01-01" "deployment"
```

### By Tags

Search conversations with specific tags:

```bash
tag_search() {
  local tag="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  c.id,
  c.project,
  substr(c.summary, 1, 120) || '...' as summary,
  group_concat(t.name, ', ') as tags
FROM conversations c
JOIN tag_relations tr ON c.id = tr.conversation_id
JOIN tags t ON tr.tag_id = t.id
WHERE t.name = '${tag}'
GROUP BY c.id
ORDER BY c.timestamp DESC
LIMIT 10;
EOF
}

tag_search "bugfix"
```

## Combined Search

### Multi-Criteria Search

Combine multiple filters:

```bash
advanced_search() {
  local query="$1"
  local project="${2:-}"
  local start_date="${3:-}"
  local limit="${4:-10}"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  c.id,
  c.project,
  substr(c.summary, 1, 100) || '...' as summary,
  datetime(c.timestamp, 'localtime') as date
FROM conversations c
WHERE c.summary LIKE "%${query}%"
  ${project:+AND c.project = '${project}'}
  ${start_date:+AND date(c.timestamp) >= date('${start_date}')}
ORDER BY c.timestamp DESC
LIMIT ${limit};
EOF
}

advanced_search "performance" "my-app" "2025-06-01" 5
```

## Export Results

### Export to JSON

Save search results as JSON:

```bash
export_search_json() {
  local query="$1"
  local output="$2"

  sqlite3 ~/.claude/memory/memory.db -json << EOF > "${output}"
SELECT
  json_object(
    'id', id,
    'project', project,
    'summary', summary,
    'user_message', user_message,
    'timestamp', datetime(timestamp, 'iso')
  ) as result
FROM conversations
WHERE summary LIKE "%${query}%"
ORDER BY timestamp DESC
LIMIT 10;
EOF
}

export_search_json "authentication" results.json
```

### Export to Markdown

Create readable report:

```bash
export_search_md() {
  local query="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode list
.separator '\n'

SELECT '# Search Results: ${query}'
FROM (SELECT 1);

SELECT '## ' || substr(summary, 1, 60) || '...'
FROM conversations
WHERE summary LIKE "%${query}%"
ORDER BY timestamp DESC
LIMIT 10;

SELECT ''
|| '**Project:** ' || COALESCE(project, 'global')
|| '**Date:** ' || datetime(timestamp, 'localtime')
|| '**ID:** ' || id
|| ''
|| '### User Message'
|| user_message
|| ''
|| '### Assistant Message'
|| assistant_message
|| '---'
FROM conversations
WHERE summary LIKE "%${query}%"
ORDER BY timestamp DESC
LIMIT 10;
EOF
}

export_search_md "database" > search-results.md
```

## Best Practices

- Use semantic search for finding related concepts, not exact matches
- Combine semantic and text search for comprehensive results
- Filter by project when working in specific context
- Limit results to top matches for faster review
- Export results when needing to share findings
- Use date filters for recent context
- Tag search helps find categorized conversations
