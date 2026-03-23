#!/bin/bash
# Pre-Compact Hook
# Triggered before conversation compaction
# Ensures current session data is available for indexing

set -e

# Configuration
MEMORY_DB="${MEMORY_DB:-~/.claude/memory/memory.db}"
PLUGIN_ROOT="/Users/praveshkhatana/.claude/plugins/claude-memory-manager"

# Expand tilde in path
MEMORY_DB="${MEMORY_DB/#\~/$HOME}"

# Ensure database exists
if [[ ! -f "$MEMORY_DB" ]]; then
  exit 0
fi

# This hook ensures that before compaction, we have opportunity
# to analyze the current conversation context
# Actual indexing happens after SessionEnd

echo "Pre-compact: preparing for session analysis" >&2

exit 0
