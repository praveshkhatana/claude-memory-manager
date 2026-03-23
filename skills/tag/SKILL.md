---
name: tag
description: This skill should be used when user asks to "add tags", "tag conversation", "manage tags", "search by tags", "list tags", "remove tags", or needs to organize and categorize conversations using the tagging system.
version: 0.1.0
---

# Tag Management

Organize and categorize conversations using a flexible tagging system for improved searchability and context management.

## Tag Operations

### Add Tag to Conversation

Apply a tag to a specific conversation:

```bash
add_tag() {
  local conversation_id="$1"
  local tag_name="$2"

  # Create tag if doesn't exist
  sqlite3 ~/.claude/memory/memory.db << EOF
INSERT OR IGNORE INTO tags (name) VALUES ('${tag_name}');
EOF

  # Link tag to conversation
  sqlite3 ~/.claude/memory/memory.db << EOF
INSERT OR IGNORE INTO tag_relations (conversation_id, tag_id)
SELECT ${conversation_id}, id
FROM tags
WHERE name = '${tag_name}';
EOF
}

add_tag 123 "bugfix"
```

### Remove Tag

Remove a tag from a conversation:

```bash
remove_tag() {
  local conversation_id="$1"
  local tag_name="$2"

  sqlite3 ~/.claude/memory/memory.db << EOF
DELETE FROM tag_relations
WHERE conversation_id = ${conversation_id}
  AND tag_id = (SELECT id FROM tags WHERE name = '${tag_name}');
EOF
}

remove_tag 123 "wontfix"
```

### List Conversation Tags

View all tags on a conversation:

```bash
list_conversation_tags() {
  local conversation_id="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  t.name as tag
FROM tags t
JOIN tag_relations tr ON t.id = tr.tag_id
WHERE tr.conversation_id = ${conversation_id}
ORDER BY t.name;
EOF
}

list_conversation_tags 123
```

## Tag Management

### List All Tags

View all available tags:

```bash
list_all_tags() {
  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  name as tag,
  COUNT(tr.conversation_id) as usage_count
FROM tags t
LEFT JOIN tag_relations tr ON t.id = tr.tag_id
GROUP BY t.id
ORDER BY usage_count DESC, name;
EOF
}

list_all_tags
```

### Create Tag

Create a new tag manually:

```bash
create_tag() {
  local tag_name="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
INSERT OR IGNORE INTO tags (name) VALUES ('${tag_name}');
EOF
}

create_tag "production-issue"
```

### Delete Tag

Remove a tag entirely:

```bash
delete_tag() {
  local tag_name="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
DELETE FROM tag_relations
WHERE tag_id = (SELECT id FROM tags WHERE name = '${tag_name}');

DELETE FROM tags
WHERE name = '${tag_name}';
EOF
}

delete_tag "deprecated"
```

### Rename Tag

Rename an existing tag:

```bash
rename_tag() {
  local old_name="$1"
  local new_name="$2"

  sqlite3 ~/.claude/memory/memory.db << EOF
UPDATE tags
SET name = '${new_name}'
WHERE name = '${old_name}';
EOF
}

rename_tag "bugfix" "bug-fix"
```

## Bulk Tagging

### Tag Multiple Conversations

Apply tag to multiple conversations:

```bash
bulk_tag() {
  local query="$1"
  local tag_name="$2"

  # Create tag
  create_tag "${tag_name}"

  # Find conversations and apply tag
  sqlite3 ~/.claude/memory/memory.db << EOF
INSERT OR IGNORE INTO tag_relations (conversation_id, tag_id)
SELECT id, (SELECT id FROM tags WHERE name = '${tag_name}')
FROM conversations
WHERE summary LIKE "%${query}%";
EOF
}

bulk_tag "authentication" "security"
```

### Tag by Project

Apply tags to all conversations in a project:

```bash
tag_project() {
  local project="$1"
  local tag_name="$2"

  create_tag "${tag_name}"

  sqlite3 ~/.claude/memory/memory.db << EOF
INSERT OR IGNORE INTO tag_relations (conversation_id, tag_id)
SELECT id, (SELECT id FROM tags WHERE name = '${tag_name}')
FROM conversations
WHERE project = '${project}';
EOF
}

tag_project "my-app" "frontend"
```

### Tag by Date Range

Tag conversations from time period:

```bash
tag_date_range() {
  local start_date="$1"
  local end_date="$2"
  local tag_name="$3"

  create_tag "${tag_name}"

  sqlite3 ~/.claude/memory/memory.db << EOF
INSERT OR IGNORE INTO tag_relations (conversation_id, tag_id)
SELECT id, (SELECT id FROM tags WHERE name = '${tag_name}')
FROM conversations
WHERE date(timestamp) BETWEEN date('${start_date}') AND date('${end_date}');
EOF
}

tag_date_range "2025-01-01" "2025-01-31" "q1-2025"
```

## Auto Tagging

### Auto-Tag from Summary

Analyze summaries and auto-tag:

```bash
auto_tag_summaries() {
  local limit="${1:-50}"

  sqlite3 ~/.claude/memory/memory.db << EOF
-- Create common tags if not exist
INSERT OR IGNORE INTO tags (name) VALUES
  ('bugfix'), ('feature'), ('refactor'),
  ('testing'), ('deployment'), ('documentation'),
  ('api'), ('database'), ('security'),
  ('performance'), ('ui'), ('backend');

-- Apply tags based on summary content
INSERT OR IGNORE INTO tag_relations (conversation_id, tag_id)
SELECT c.id, t.id
FROM conversations c
CROSS JOIN tags t
WHERE c.summary IS NOT NULL
  AND c.id NOT IN (SELECT conversation_id FROM tag_relations)
  AND (
    (t.name = 'bugfix' AND (c.summary LIKE '%bug%' OR c.summary LIKE '%fix%'))
    OR (t.name = 'feature' AND c.summary LIKE '%feature%')
    OR (t.name = 'refactor' AND c.summary LIKE '%refactor%')
    OR (t.name = 'testing' AND c.summary LIKE '%test%')
    OR (t.name = 'deployment' AND c.summary LIKE '%deploy%')
    OR (t.name = 'documentation' AND c.summary LIKE '%doc%')
    OR (t.name = 'api' AND c.summary LIKE '%api%')
    OR (t.name = 'database' AND (c.summary LIKE '%db%' OR c.summary LIKE '%sql%' OR c.summary LIKE '%migration%'))
    OR (t.name = 'security' AND c.summary LIKE '%sec%')
    OR (t.name = 'performance' AND c.summary LIKE '%perf%')
    OR (t.name = 'ui' AND c.summary LIKE '%ui%' OR c.summary LIKE '%frontend%')
    OR (t.name = 'backend' AND c.summary LIKE '%backend%')
  )
LIMIT ${limit};
EOF
}

auto_tag_summaries
```

### Auto-Tag by Keywords

Tag based on custom keyword patterns:

```bash
auto_tag_keywords() {
  local tag_name="$1"
  local keywords="$2"  # space-separated keywords

  create_tag "${tag_name}"

  sqlite3 ~/.claude/memory/memory.db << EOF
INSERT OR IGNORE INTO tag_relations (conversation_id, tag_id)
SELECT c.id, (SELECT id FROM tags WHERE name = '${tag_name}')
FROM conversations c
WHERE c.summary IS NOT NULL
  AND c.id NOT IN (SELECT conversation_id FROM tag_relations)
  AND (
EOF

  # Build WHERE clause from keywords
  first=true
  for kw in $keywords; do
    if [ "$first" = true ]; then
      echo "c.summary LIKE '%${kw}%'"
      first=false
    else
      echo "OR c.summary LIKE '%${kw}%'"
    fi
  done

  echo ");"
}

auto_tag_keywords "critical-issue" "crash exception failure panic"
```

## Tag Search

### Search by Single Tag

Find conversations with specific tag:

```bash
search_by_tag() {
  local tag_name="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  c.id,
  c.project,
  substr(c.summary, 1, 100) || '...' as summary,
  datetime(c.timestamp, 'localtime') as date
FROM conversations c
JOIN tag_relations tr ON c.id = tr.conversation_id
JOIN tags t ON tr.tag_id = t.id
WHERE t.name = '${tag_name}'
ORDER BY c.timestamp DESC;
EOF
}

search_by_tag "bugfix"
```

### Search by Multiple Tags

Find conversations with all specified tags:

```bash
search_multi_tag() {
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
HAVING COUNT(DISTINCT t.id) >= $(echo "$tags" | tr ',' '\n' | wc -l)
ORDER BY c.timestamp DESC;
EOF
}

search_multi_tag "bugfix,api"
```

### Tag Statistics

View tag usage statistics:

```bash
tag_stats() {
  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  t.name as tag,
  COUNT(tr.conversation_id) as conversations,
  MIN(c.timestamp) as first_used,
  MAX(c.timestamp) as last_used
FROM tags t
LEFT JOIN tag_relations tr ON t.id = tr.tag_id
LEFT JOIN conversations c ON tr.conversation_id = c.id
GROUP BY t.id
ORDER BY COUNT(tr.conversation_id) DESC;
EOF
}

tag_stats
```

## Tag Organization

### Tag Hierarchy

Organize tags with hierarchical naming:

```bash
# Use colon-separated hierarchy
create_tag "bugfix:authentication"
create_tag "bugfix:database"
create_tag "feature:ui"
create_tag "feature:api"

# Search by parent tag
search_tag_hierarchy() {
  local parent_tag="$1"

  sqlite3 ~/.claude/memory/memory.db << EOF
.mode box
.headers on

SELECT
  c.id,
  t.name as full_tag,
  substr(c.summary, 1, 60) || '...' as summary
FROM conversations c
JOIN tag_relations tr ON c.id = tr.conversation_id
JOIN tags t ON tr.tag_id = t.id
WHERE t.name LIKE '${parent_tag}:%'
ORDER BY t.name, c.timestamp DESC;
EOF
}

search_tag_hierarchy "bugfix"
```

### Merge Tags

Combine multiple tags into one:

```bash
merge_tags() {
  local source_tag="$1"
  local target_tag="$2"

  sqlite3 ~/.claude/memory/memory.db << EOF
-- Reassign all relations from source to target
UPDATE OR REPLACE tag_relations
SET tag_id = (SELECT id FROM tags WHERE name = '${target_tag}')
WHERE tag_id = (SELECT id FROM tags WHERE name = '${source_tag}');

-- Delete source tag
DELETE FROM tags
WHERE name = '${source_tag}';
EOF
}

merge_tags "bug" "bugfix"
```

## Best Practices

- Use descriptive, specific tag names
- Apply tags consistently across conversations
- Use auto-tagging for common patterns
- Organize tags with hierarchical naming
- Regularly review and cleanup unused tags
- Use tags to supplement semantic search
- Merge similar tags to reduce clutter
