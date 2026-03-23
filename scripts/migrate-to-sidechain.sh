#!/bin/bash
# Migration script to add sidechain columns to conversations table
# Adds: is_sidechain, parent_uuid, session_id

MEMORY_DB="${MEMORY_DB:-~/.claude/memory/memory.db}"

# Expand tilde
MEMORY_DB="${MEMORY_DB/#\~/$HOME}"

echo "Migrating memory database to support sidechain storage..."

# Check if database exists
if [[ ! -f "$MEMORY_DB" ]]; then
  echo "Error: Memory database not found at $MEMORY_DB"
  exit 1
fi

# Check if sidechain columns already exist
if sqlite3 "$MEMORY_DB" "PRAGMA table_info(conversations);" | grep -q "is_sidechain"; then
  echo "Sidechain columns already exist. Migration not needed."
  exit 0
fi

# Add new columns
sqlite3 "$MEMORY_DB" "ALTER TABLE conversations ADD COLUMN is_sidechain INTEGER DEFAULT 0;"
sqlite3 "$MEMORY_DB" "ALTER TABLE conversations ADD COLUMN parent_uuid TEXT;"
sqlite3 "$MEMORY_DB" "ALTER TABLE conversations ADD COLUMN session_id TEXT;"

# Verify migration
if sqlite3 "$MEMORY_DB" "PRAGMA table_info(conversations);" | grep -q "is_sidechain"; then
  echo "✅ Migration successful. Added columns:"
  echo "  - is_sidechain (INTEGER DEFAULT 0)"
  echo "  - parent_uuid (TEXT)"
  echo "  - session_id (TEXT)"
else
  echo "✗ Migration failed"
  exit 1
fi