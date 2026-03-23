#!/bin/bash
# Pre-Compact Hook with Quality Analysis
# Runs BEFORE compaction to analyze and store meaningful content as sidechains

set -e

# Configuration
MEMORY_DB="${MEMORY_DB:-~/.claude/memory/memory.db}"
PLUGIN_ROOT="/path/to/claude/plugins/claude-memory-manager"
DETECTOR="$PLUGIN_ROOT/hooks/scripts/quality-detector.sh"

# Expand tilde
MEMORY_DB="${MEMORY_DB/#\~/$HOME}"

# Ensure detector exists
if [[ ! -f "$DETECTOR" ]]; then
  echo "Error: Quality detector not found at $DETECTOR" >&2
  exit 1
fi

# Get content to analyze
# Sample from recent conversation (last 50 messages)
SAMPLE_FILE="/tmp/claude-conversation.log"
CONTENT=""

if [[ -f "$SAMPLE_FILE" ]]; then
  # Tail last 50 lines (approx 50 messages)
  CONTENT=$(tail -n 50 "$SAMPLE_FILE" 2>/dev/null || echo "")
fi

# If no log file, try to get from session state
# This is a fallback - in practice, Claude Code provides conversation context
if [[ -z "$CONTENT" ]]; then
  CONTENT="No conversation log available - skipping quality analysis"
fi

# Get current session metadata
SESSION_ID="${SESSION_ID:-session-$(date +%s)}"
PROJECT="${PROJECT:-Flow-Draw}"
GIT_BRANCH="${GIT_BRANCH:-main}"
WORK_DIR="${WORK_DIR:-$(pwd)}"

# Run quality detector
RESULT=$("$DETECTOR" "$CONTENT" 2>/dev/null || echo "skip|skip|no-technical-content")

# Parse result: decision|skip|reason|tags
# Result format: store|skip|reason|tags
read -r DECISION SKIP_REASON TAGs <<< "$(echo "$RESULT" | tr '|' ' ')"

# Check if we should store
if [[ "$DECISION" != "store" ]]; then
  # Not meaningful - log reason and exit
  echo "Pre-compact: Skipping - $SKIP_REASON" >&2
  exit 0
fi

# Meaningful content detected - store as sidechain
echo "Pre-compact: Storing meaningful content as sidechain" >&2

# Get parent UUID from last stored conversation (or create new)
PARENT_UUID=""
LATEST=$(sqlite3 "$MEMORY_DB" "SELECT id FROM conversations ORDER BY timestamp DESC LIMIT 1;")

if [[ -n "$LATEST" ]]; then
  PARENT_UUID="$LATEST"
fi

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Store as sidechain
# We'll store the entire content as user_message for now
# In production, this would be more sophisticated
INSERT_ID="precompact-${TIMESTAMP}-${RANDOM}"

# Build tags string
TAGs_STRING="${TAGs:-technical-content}"

# Insert into database - escape single quotes and backslashes
CONTENT_ESCAPed=$(echo "$CONTENT" | sed "s/'/''/g" | sed 's/\\/\\\\/g')
sqlite3 "$MEMORY_DB" "INSERT INTO conversations (id, project, timestamp, user_message, assistant_message, summary, embedding, tags, is_sidechain, parent_uuid, session_id) VALUES ('$INSERT_ID', '$PROJECT', '$TIMESTAMP', '$CONTENT_ESCAPed', '', '', '', '$TAGs_STRING', 1, '$PARENT_UUID', '$SESSION_ID');"

if [[ $? -eq 0 ]]; then
  echo "Pre-compact: Stored as sidechain $INSERT_ID" >&2
  echo "  Parent: $PARENT_UUID" >&2
  echo "  Tags: $TAGs_STRING" >&2
else
  echo "Pre-compact: Failed to store conversation" >&2
  # Don't fail the hook - just log error
fi

exit 0