#!/bin/bash
# Session End Hook
# Triggered when a Claude Code session ends
# Coordinates with indexing-triggers agent to determine if conversation needs indexing

set -e

# Configuration
MEMORY_DB="${MEMORY_DB:-~/.claude/memory/memory.db}"
AUTO_INDEX="${AUTO_INDEX:-true}"
PLUGIN_ROOT="/Users/praveshkhatana/.claude/plugins/claude-memory-manager"

# Expand tilde in path
MEMORY_DB="${MEMORY_DB/#\~/$HOME}"

# Ensure database exists
if [[ ! -f "$MEMORY_DB" ]]; then
  echo "Memory database not found at $MEMORY_DB"
  echo "Initialize with: cc memory-init"
  exit 0
fi

# Check if auto-indexing is enabled
if [[ "$AUTO_INDEX" != "true" ]]; then
  exit 0
fi

# Trigger indexing analysis
# This signals to the plugin that a conversation ended and should be analyzed
# The actual embedding generation happens asynchronously via auto-indexing agent

echo "Session ended - memory indexing triggered" >&2

# Log the event (could be used for analytics)
echo "$(date '+%Y-%m-%d %H:%M:%S') - Session end hook triggered" >> "$MEMORY_DB.session.log" 2>/dev/null || true

exit 0
