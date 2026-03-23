#!/bin/bash
# Session End Hook with Quality Analysis
# Runs when session ends to analyze and store remaining meaningful content

set -e

# Configuration
MEMORY_DB="${MEMORY_DB:-~/.claude/memory/memory.db}"
PLUGIN_ROOT="/Users/praveshkhatana/.claude/plugins/claude-memory-manager"
DETECTOR="$PLUGIN_ROOT/hooks/scripts/quality-detector.sh"

# Expand tilde
MEMORY_DB="${MEMORY_DB/#\~/$HOME}"

# Ensure detector exists
if [[ ! -f "$DETECTOR" ]]; then
  echo "Error: Quality detector not found at $DETECTOR" >&2
  exit 1
fi

# Get content to analyze
# Sample from recent conversation
SAMPLE_FILE="/tmp/claude-conversation.log"
CONTENT=""

if [[ -f "$SAMPLE_FILE" ]]; then
  # Tail last 100 lines (approx 100 messages)
  CONTENT=$(tail -n 100 "$SAMPLE_FILE" 2>/dev/null || echo "")
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
  echo "Session end: Skipping - $SKIP_REASON" >&2
  exit 0
fi

# Meaningful content detected - store as main session
echo "Session end: Storing meaningful content as main session" >&2

# Get parent UUID from last stored conversation (or create new)
PARENT_UUID=""
LATEST=$(sqlite3 "$MEMORY_DB" "SELECT id FROM conversations ORDER BY timestamp DESC LIMIT 1;")

if [[ -n "$LATEST" ]]; then
  PARENT_UUID="$LATEST"
fi

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Store as main session (not sidechain)
INSERT_ID="session-${TIMESTAMP}"

# Build tags string
TAGs_STRING="${TAGs:-technical-content}"

# Insert into database - escape single quotes and backslashes
CONTENT_ESCAPed=$(echo "$CONTENT" | sed "s/'/''/g" | sed 's/\\/\\\\/g')
sqlite3 "$MEMORY_DB" "INSERT INTO conversations (id, project, timestamp, user_message, assistant_message, summary, embedding, tags, is_sidechain, parent_uuid, session_id) VALUES ('$INSERT_ID', '$PROJECT', '$TIMESTAMP', '$CONTENT_ESCAPed', '', '', '', '$TAGs_STRING', 0, '$PARENT_UUID', '$SESSION_ID');"

if [[ $? -eq 0 ]]; then
  echo "Session end: Stored as main session $INSERT_ID" >&2
  echo "  Parent: $PARENT_UUID" >&2
  echo "  Tags: $TAGs_STRING" >&2
else
  echo "Session end: Failed to store conversation" >&2
  # Don't fail the hook - just log error
fi

exit 0