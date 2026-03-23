---
name: load
description: This skill should be used when user asks to "load conversation", "restore context", "get full conversation", "load from memory", "retrieve conversation details", "export conversation", or needs to load complete conversation content from the memory database.
version: 0.1.0
---

# Load Conversation

Retrieve full conversation details from memory including user messages, assistant responses, context, and metadata.

## Load by ID

### Basic Conversation Load

Retrieve complete conversation by ID:

```bash
load_conversation() {
  local conversation_id="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  id,
  project,
  datetime(timestamp, 'localtime') as date,
  summary
FROM conversations
WHERE id = ${conversation_id};
EOF
}
```

### With Full Messages

Load conversation with all messages:

```bash
load_full_conversation() {
  local conversation_id="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode list
.separator '\n'

SELECT '# Conversation #' || ${conversation_id}
FROM (SELECT 1);

SELECT ''
|| '**Project:** ' || COALESCE(project, 'global')
|| '**Date:** ' || datetime(timestamp, 'iso')
|| '**Summary:** ' || summary
|| ''
FROM conversations
WHERE id = ${conversation_id};

SELECT '## Messages'
FROM (SELECT 1);

SELECT ''
|| '### ' || UPPER(SUBSTR(role, 1, 1)) || role || SUBSTR(role, 2)
|| ''
|| content
|| ''
FROM messages
WHERE conversation_id = ${conversation_id}
ORDER BY created_at;
EOF
}

load_full_conversation 123 > conversation.md
```

## Load by Search

### Load from Search Results

Load full details of search results:

```bash
load_from_search() {
  local query="$1"
  local limit="${2:-3}"

  # First search, then load details
  local ids=$(sqlite3 ~/.claude/memory/memory.db << EOF
.mode list
SELECT id
FROM conversations
WHERE summary LIKE "%${query}%"
ORDER BY timestamp DESC
LIMIT ${limit};
EOF
)

  for id in $ids; do
    echo "=== Loading conversation $id ==="
    load_full_conversation "$id"
    echo ""
  done
}

load_from_search "authentication"
```

### Load Most Recent

Load the most recent conversation:

```bash
load_recent() {
  sqlite3 ~/.claude/memory/memory.db << EOF
.mode list
.separator '\n'

SELECT '# Most Recent Conversation'
FROM (SELECT 1);

SELECT ''
|| '**ID:** ' || id
|| '**Project:** ' || COALESCE(project, 'global')
|| '**Date:** ' || datetime(timestamp, 'iso')
|| ''
|| summary
|| ''
FROM conversations
ORDER BY timestamp DESC
LIMIT 1;

SELECT '## Full Context'
FROM (SELECT 1);

SELECT user_message || ''
|| assistant_message
FROM (SELECT user_message, assistant_message FROM conversations ORDER BY timestamp DESC LIMIT 1);
EOF
}
```

## Load by Project

### Project History

Load conversations from a specific project:

```bash
load_project_history() {
  local project="$1"
  local limit="${2:-5}"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  id,
  substr(summary, 1, 100) || '...' as summary,
  datetime(timestamp, 'localtime') as date
FROM conversations
WHERE project = '${project}'
ORDER BY timestamp DESC
LIMIT ${limit};
EOF
}

load_project_history "my-app" 10
```

### Full Project Context

Load all conversations from project:

```bash
load_full_project() {
  local project="$1"
  local output_dir="$2"

  mkdir -p "${output_dir}"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode list
SELECT '# Project: ${project}'
FROM (SELECT 1);

SELECT ''
|| '## Conversation #' || id
|| ''
|| summary
|| ''
|| datetime(timestamp, 'iso')
|| ''
|| '---'
FROM conversations
WHERE project = '${project}'
ORDER BY timestamp DESC;
EOF > "${output_dir}/project-history.md"
}

load_full_project "my-project" ./project-exports
```

## Load by Tags

### Tagged Conversations

Load conversations with specific tags:

```bash
load_tagged() {
  local tag="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  c.id,
  c.project,
  substr(c.summary, 1, 100) || '...' as summary,
  group_concat(t.name, ', ') as tags
FROM conversations c
JOIN tag_relations tr ON c.id = tr.conversation_id
JOIN tags t ON tr.tag_id = t.id
WHERE t.name = '${tag}'
GROUP BY c.id
ORDER BY c.timestamp DESC;
EOF
}

load_tagged "bugfix"
```

### Multi-Tag Search

Load conversations matching multiple tags:

```bash
load_multi_tag() {
  local tags="$1"  # comma-separated: "bugfix,api"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  c.id,
  c.project,
  substr(c.summary, 1, 80) || '...' as summary,
  group_concat(t.name, ', ') as tags
FROM conversations c
JOIN tag_relations tr ON c.id = tr.conversation_id
JOIN tags t ON tr.tag_id = t.id
WHERE t.name IN ('${tags//,/','}')
GROUP BY c.id
HAVING COUNT(DISTINCT t.id) >= 2
ORDER BY c.timestamp DESC;
EOF
}

load_multi_tag "feature,testing"
```

## Load for Context

### Context Only (Summaries)

Load just summaries for context building:

```bash
load_context_summaries() {
  local project="${1:-}"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode list
.separator '\n'

SELECT '# Relevant Context'
FROM (SELECT 1);

SELECT ''
|| '## ' || project || ' - ' || datetime(timestamp, 'iso')
|| ''
|| summary
|| ''
FROM conversations
WHERE summary IS NOT NULL
  ${project:+AND project = '${project}'}
ORDER BY timestamp DESC
LIMIT 10;
EOF
}

load_context_summaries "my-project"
```

### Incremental Context Loading

Load context progressively based on need:

```bash
load_incremental_context() {
  local query="$1"
  local initial_limit="${2:-3}"
  local additional_limit="${3:-5}"

  # Initial load
  echo "# Initial Context"
  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on
SELECT id, substr(summary, 1, 100) FROM conversations WHERE summary LIKE "%${query}%" ORDER BY vec_distance(embedding, (SELECT embedding FROM conversations LIMIT 1)) ASC LIMIT ${initial_limit};
EOF

  # Ask if more context needed
  read -p "Load more context? (y/n) " -n 1 -r answer
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    echo "# Additional Context"
    sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on
SELECT id, substr(summary, 1, 100) FROM conversations WHERE summary LIKE "%${query}%" ORDER BY vec_distance(embedding, (SELECT embedding FROM conversations LIMIT 1)) ASC LIMIT ${additional_limit} OFFSET ${initial_limit};
EOF
  fi
}

load_incremental_context "database schema"
```

## Export Conversations

### Export Single Conversation

Export conversation to file:

```bash
export_conversation() {
  local conversation_id="$1"
  local output_file="$2"

  sqlite3 ~/.claude/memory/memory.db << EOF > "${output_file}"
# Conversation ${conversation_id}
# Exported: $(date '+%Y-%m-%d %H:%M:%S')

## Metadata
Project: $(project || 'global')
Date: $(datetime(timestamp, 'iso'))
Summary:
$(summary)

## User Message
$(user_message)

## Assistant Message
$(assistant_message)
EOF
}

export_conversation 123 conversation-123.md
```

### Export Bulk

Export multiple conversations:

```bash
export_bulk() {
  local query="$1"
  local output_dir="$2"

  mkdir -p "${output_dir}"

  local ids=$(sqlite3 ~/.claude/memory/memory.db "
    SELECT id FROM conversations
    WHERE summary LIKE '%${query}%'
    ORDER BY timestamp DESC
    LIMIT 10;
  ")

  for id in $ids; do
    export_conversation "$id" "${output_dir}/conv-${id}.md"
  done

  echo "Exported $(echo $ids | wc -w) conversations to ${output_dir}"
}

export_bulk "authentication" ./exports
```

## Load Formats

### JSON Export

Export as structured JSON:

```bash
export_json() {
  local conversation_id="$1"

  sqlite3 ~/.claude/memory/memory.db -json << EOF
SELECT json_object(
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
      WHERE tr.conversation_id = conversations.id
    )
  )
FROM conversations
WHERE id = ${conversation_id};
EOF
}

export_json 123 > conversation-123.json
```

### Markdown Export

Export as formatted markdown:

```bash
export_markdown() {
  local conversation_id="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode list
.separator '\n'

SELECT # Conversation ${conversation_id}
FROM (SELECT 1);

SELECT ''
|| '---'
|| ''
|| '**Project:** ' || COALESCE(project, 'global')
|| '**Date:** ' || datetime(timestamp, 'iso')
|| ''
|| '## Summary'
|| ''
|| summary
|| ''
|| '## Conversation'
|| ''
|| '### User'
|| ''
|| user_message
|| ''
|| '### Assistant'
|| ''
|| assistant_message
FROM conversations
WHERE id = ${conversation_id};
EOF
}

export_markdown 123 > conversation-123.md
```

## Best Practices

- Use summaries first for context, load full only when needed
- Limit initial context loads to avoid token waste
- Export conversations for sharing or external review
- Use incremental loading for large conversation histories
- Filter by project or tags when searching
- Include metadata when exporting for reference
