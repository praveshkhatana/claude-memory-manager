---
name: memory-init
description: This skill should be used when user asks to "initialize memory", "set up memory database", "initialize memory plugin", "create memory database", or needs to initialize the memory plugin database and tables.
version: 0.1.0
---

# Memory Initialization

Initialize the memory plugin database and create necessary tables for storing conversation history.

## Quick Initialize

Create the memory database with all required tables:

```bash
# Create memory directory
mkdir -p ~/.claude/memory

# Initialize database
sqlite3 ~/.claude/memory/memory.db << 'EOF'
-- Memory Database Initialization
-- Created: $(date '+%Y-%m-%d %H:%M:%S')

-- Enable foreign keys and WAL mode
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  project TEXT,
  timestamp TEXT,
  user_message TEXT,
  assistant_message TEXT,
  summary TEXT,
  embedding BLOB,
  tags TEXT,
  parent_uuid TEXT,
  is_sidechain INTEGER DEFAULT 0,
  session_id TEXT,
  cwd TEXT,
  git_branch TEXT,
  claude_version TEXT,
  thinking_level TEXT,
  thinking_disabled INTEGER DEFAULT 0,
  thinking_triggers TEXT
);

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  created_at TEXT
);

-- Create tag relations table
CREATE TABLE IF NOT EXISTS tag_relations (
  conversation_id TEXT,
  tag_id INTEGER,
  created_at TEXT,
  PRIMARY KEY (conversation_id, tag_id),
  FOREIGN Key (conversation_id) REFERENCES conversations(id),
  FOREIGN Key (tag_id) REFERENCES tags(id)
);

-- Create embeddings vector index
CREATE VIRTUAL TABLE IF NOT EXISTS embeddings USING vec0(embedding, 1536);

-- Insert default tags
INSERT OR IGNORE INTO tags (name, created_at) VALUES
  ('bugfix', datetime('now')),
  ('feature', datetime('now')),
  ('refactor', datetime('now')),
  ('documentation', datetime('now')),
  ('optimization', datetime('now'));

-- Verification
SELECT 'Database initialized successfully' as status;
SELECT COUNT(*) as total_tags FROM tags;
EOF
```

## Verify Initialization

Check if database was created successfully:

```bash
# Check database exists
if [ -f ~/.claude/memory/memory.db ]; then
  echo "✓ Database exists"
else
  echo "✗ Database not found"
fi

# Check tables
sqlite3 ~/.claude/memory/memory.db << 'EOF'
.tables
EOF

# Check tags
sqlite3 ~/.claude/memory/memory.db << 'EOF'
SELECT * FROM tags;
EOF
```

## Manual Database Setup

If automatic setup fails, run these commands:

```bash
# Step 1: Create directory
mkdir -p ~/.claude/memory

# Step 2: Initialize database
sqlite3 ~/.claude/memory/memory.db << 'EOF'
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  project TEXT,
  timestamp TEXT,
  user_message TEXT,
  assistant_message TEXT,
  summary TEXT,
  embedding BLOB,
  tags TEXT,
  parent_uuid TEXT,
  is_sidechain INTEGER DEFAULT 0,
  session_id TEXT,
  cwd TEXT,
  git_branch TEXT,
  claude_version TEXT,
  thinking_level TEXT,
  thinking_disabled INTEGER DEFAULT 0,
  thinking_triggers TEXT
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS tag_relations (
  conversation_id TEXT,
  tag_id INTEGER,
  created_at TEXT,
  PRIMARY Key (conversation_id, tag_id),
  FOREIGN Key (conversation_id) REFERENCES conversations(id),
  FOREIGN Key (tag_id) REFERENCES tags(id)
);
EOF

# Step 3: Insert default tags
sqlite3 ~/.claude/memory/memory.db << 'EOF'
INSERT OR IGNORE INTO tags (name, created_at) VALUES
  ('bugfix', datetime('now')),
  ('feature', datetime('now')),
  ('refactor', datetime('now')),
  ('documentation', datetime('now')),
  ('optimization', datetime('now'));
EOF
```

## Configuration

### Database Location

Default: `~/.claude/memory/memory.db`

To change location, set environment variable:
```bash
export MEMORY_DB_PATH=/path/to/custom/location.db
```

### Auto-Init on First Use

The plugin will automatically initialize the database on first use if it doesn't exist.

## Best Practices

- Run initialization once during plugin setup
- Check database integrity regularly
- Backup database before major operations
- Use proper error handling for database operations