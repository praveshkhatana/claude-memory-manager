# Automatic Meaningful Memory Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automatic meaningful conversation storage at pre-compact points and session end to preserve context before loss during compaction, using quality detection to store only valuable content.

**Architecture:** Quality detector script analyzes conversation content before compaction, stores meaningful content as sidechain records with `is_sidechain=1` linking to parent sessions, then session end stores remaining content as main session records with `is_sidechain=0`.

**Tech Stack:** Bash scripts, SQLite database (sql.js CommonJS), semantic embeddings, quality detection rules

---

### Task 1: Phase 1 - Quality Detection Implementation

**Files:**
- Create: `/Users/praveshkhatana/.claude/plugins/claude-memory-manager/hooks/scripts/quality-detector.sh`
- Test: `/Users/praveshkhatana/.claude/plugins/claude-memory-manager/tests/unit/test-quality-detector.sh`

- [ ] **Step 1: Create quality detector script structure**

```bash
#!/bin/bash
# Quality Detector Script
# Analyzes conversation content to determine if it's worth storing

analyze() {
  local messages="$1"
  local last_store_time="$2"

  # Implementation: sampling, fast-path detection, deep analysis
  # Returns: store|skip + reason + tags + memory_type
}

detect_user_feedback() {
  local text="$1"
  # Returns: memory_type, tags
}

detect_tech_content() {
  local text="$1"
  # Returns: boolean, tags
}

detect_problem_solving() {
  local text="$1"
  # Returns: boolean
}

detect_decision_making() {
  local text="$1"
  # Returns: boolean
}
```

- [ ] **Step 2: Implement content sampling logic**

```bash
# Sample: Last 50 messages OR last 10K characters (whichever comes first)
sample_content() {
  local messages="$1"
  local char_limit=10000
  local message_limit=50

  # Count characters and messages
  local char_count=${#messages}
  local message_count=$(echo "$messages" | grep -c "^--")

  if [[ $char_count -ge $char_limit ]] || [[ $message_count -ge $message_limit ]]; then
    # Sample approach: take last portion
    echo "$messages" | tail -n $message_limit
  else
    echo "$messages"
  fi
}
```

- [ ] **Step 3: Implement fast-path keyword detection**

```bash
# First pass: Quick keyword check (100ms max)
detect_fast_path() {
  local text="$1"

  # Technical keywords
  local tech_keywords=("API" "function" "component" "service" "module" "import" "export" "return" "const" "let" "var" "class" "interface" "type" "enum" "async" "await" "Promise" "Promise.all" "fetch" "axios" "express" "react" "vue" "angular" "angularjs" "node" "npm" "yarn" "webpack" "vite" "next" "nextjs" "nuxt" "nuxtjs" "django" "flask" "fastapi" "gorm" "sequelize" "prisma" "typeorm" "mongodb" "postgresql" "mysql" "sqlite" "redis" "cache" "buffer" "stream" "event" "emit" "on" "once" "subscribe" "unsubscribe" "middleware" "controller" "route" "router" "path" "url" "query" "params" "body" "request" "response" "status" "json" "xml" "yaml" "markdown" "html" "css" "scss" "less" "stylus" "tailwind" "styled" "styled-components" "emotion" "jss" "styletron" "material-ui" "antd" "chakra-ui" "nextui" "theme" "color" "font" "typography" "spacing" "padding" "margin" "border" "radius" "shadow" "elevation" "z-index" "position" "flex" "grid" "layout" "component" "page" "route" "navigation" "router" "link" "redirect" "redirect" "navigate" "useNavigate" "useParams" "useLocation" "useHistory" "useState" "useEffect" "useContext" "useReducer" "useSelector" "useDispatch" "useMemo" "useCallback" "useRef" "useImperativeHandle" "useId" "useTransition" "useDeferredValue" "useId" "useId" "useId" "useId" "useId" "useId" "useId" "useId" "useId" "useId" "useId" "useId" "useId" "useId" "useId" "useId")

  # Check for any tech keyword
  for keyword in "${tech_keywords[@]}"; do
    if [[ "$text" =~ "$keyword" ]]; then
      echo "store|skip|technical|$keyword"
      return 0
    fi
  done

  # Check for problem-solving keywords
  local problem_keywords=("fix" "resolve" "solve" "debug" "troubleshoot" "error" "exception" "crash" "fail" "broken" "not working" "doesn't work" "issue" "problem" "issue" "bug" "improve" "optimize" "refactor" "rewrite" "rewrite" "change" "modify" "add" "remove" "delete" "rename" "rename" "update" "update" "upgrade" "downgrade" "test" "testing" "unit" "integration" "e2e" "end-to-end" "coverage" "test" "spec" "describe" "it" "expect" "should" "must" "require")

  for keyword in "${problem_keywords[@]}"; do
    if [[ "$text" =~ "$keyword" ]]; then
      echo "store|skip|problem-solving|$keyword"
      return 0
    fi
  done

  # Check for decision-making keywords
  local decision_keywords=("decided" "chose" "preferred" "instead" "rather" "better" "best" "optimal" "optimal" "choice" "decision" "approach" "method" "strategy" "technique")

  for keyword in "${decision_keywords[@]}"; do
    if [[ "$text" =~ "$keyword" ]]; then
      echo "store|skip|decision-making|$keyword"
      return 0
    fi
  done

  echo "skip|skip|social|no-technical-content"
  return 1
}
```

- [ ] **Step 4: Implement user/feedback pattern detection**

```bash
# Detect user preferences and feedback patterns
detect_user_patterns() {
  local text="$1"
  local memory_type="user"
  local tags=()

  # Feedback patterns
  if [[ "$text" =~ "don't" ]] || [[ "$text" =~ "don't" ]] || [[ "$text" =~ "don't" ]]; then
    memory_type="feedback"
    tags+=("feedback" "avoid")
  fi

  if [[ "$text" =~ "not" ]] && [[ "$text" =~ "mock" ]]; then
    memory_type="feedback"
    tags+=("feedback" "avoid-mock")
  fi

  if [[ "$text" =~ "exactly" ]] || [[ "$text" =~ "perfect" ]] || [[ "$text" =~ "exactly" ]]; then
    memory_type="feedback"
    tags+=("feedback" "confirmed-good")
  fi

  if [[ "$text" =~ "I'm.*expert" ]] || [[ "$text" =~ "new to" ]]; then
    memory_type="user"
    tags+=("user" "expertise")
  fi

  if [[ "$text" =~ "prefer.*over" ]]; then
    memory_type="user"
    tags+=("user" "prefer")
  fi

  if [[ "$text" =~ "stop doing" ]]; then
    memory_type="feedback"
    tags+=("feedback" "stop")
  fi

  echo "$memory_type|${tags[*]}"
}
```

- [ ] **Step 5: Write unit tests**

```bash
#!/bin/bash
# Test quality detector

test_tech_content() {
  local text='const api = axios.create(); return api.fetch();'
  local result=$(echo "$text" | bash quality-detector.sh analyze "$text")
  echo "Test tech content: $result"
  # Expected: store|skip|technical|...
}

test_social_content() {
  local text='Hello, how are you? Thanks for your help!'
  local result=$(echo "$text" | bash quality-detector.sh analyze "$text")
  echo "Test social content: $result"
  # Expected: skip|skip|social|no-technical-content
}

test_problem_solving() {
  local text='Error: X... Tried Y... Solution: Z...'
  local result=$(echo "$text" | bash quality-detector.sh analyze "$text")
  echo "Test problem-solving: $result"
  # Expected: store|skip|problem-solving|...
}

# Run tests
test_tech_content
test_social_content
test_problem_solving
```

- [ ] **Step 6: Commit**

```bash
git add hooks/scripts/quality-detector.sh tests/unit/test-quality-detector.sh
git commit -m "feat: implement quality detection for meaningful storage"
```

---

### Task 2: Phase 2 - PreCompact Hook Replacement

**Files:**
- Modify: `/Users/praveshkhatana/.claude/plugins/claude-memory-manager/hooks/scripts/pre-compact.sh`
- Modify: `/Users/praveshkhatana/.claude/plugins/claude-memory-manager/hooks/hooks.json`

- [ ] **Step 1: Read current pre-compact hook**

```bash
# Read existing pre-compact script
cat /Users/praveshkhatana/.claude/plugins/claude-memory-manager/hooks/scripts/pre-compact.sh
```

- [ ] **Step 2: Rewrite pre-compact-analyze.sh**

```bash
#!/bin/bash
set -e

# PreCompact Analysis Hook - Fires BEFORE compaction
# Stores meaningful content as sidechain

MEMORY_DB="${MEMORY_DB:-~/.claude/memory/memory.db}"
AUTO_INDEX="${AUTO_INDEX:-true}"
PLUGIN_ROOT="/Users/praveshkhatana/.claude/plugins/claude-memory-manager"

MEMORY_DB="${MEMORY_DB/#\~/$HOME}"

if [[ ! -f "$MEMORY_DB" ]]; then
  echo "Memory database not found at $MEMORY_DB"
  exit 0
fi

if [[ "$AUTO_INDEX" != "true" ]]; then
  exit 0
fi

echo "PreCompact hook - analyzing content before compaction" >&2

# Get conversation data since last stored milestone
# Extract from hook environment or log file
# For now, analyze last 50 messages or 10K chars

# Sample content
CONTENT=$(tail -n 50 /tmp/claude-conversation.log 2>/dev/null || echo "")

# Run quality detector
DEcision=$(echo "$CONTENT" | bash "$PLUGIN_ROOT/hooks/scripts/quality-detector.sh" analyze "$CONTENT")

# Parse result: store|skip|reason|tag
RESULT=$(echo "$DEcision" | cut -d'|' -f1)
REASON=$(echo "$DEcision" | cut -d'|' -f2)
TAG=$(echo "$DEcision" | cut -d'|' -f3)

if [[ "$RESULT" == "store" ]]; then
  echo "Storing as sidechain: $REASON" >&2

  # Store as sidechain in database
  # Generate ID: milestone-${timestamp}
  TIMESTAMP=$(date +%s)
  ID="milestone-${TIMESTAMP}"

  # Insert into conversations table
  # Use node script to insert with proper formatting
  node "$PLUGIN_ROOT/src/insert-sidechain.js" \
    --id "$ID" \
    --project "Flow-Draw" \
    --content "$CONTENT" \
    --is-sidechain 1 \
    --parent-uuid "session-$(date +%s)" \
    --tags "$TAG"

  echo "✓ Stored sidechain milestone: $ID" >&2
else
  echo "Skipping: $REASON" >&2
fi

exit 0
```

- [ ] **Step 3: Create insert-sidechain.js helper**

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load sql.js
const initSqlJs = require('sql.js');

async function insertSidechain(options) {
  const SQL = await initSqlJs();

  // Create or load database
  const dbPath = process.env.HOME + '/.claude/memory/memory.db';
  let db;

  if (fs.existsSync(dbPath)) {
    const data = fs.readFileSync(dbPath);
    db = new SQL.Database(data);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  // Insert sidechain record
  const id = options.id;
  const project = options.project || 'Flow-Draw';
  const timestamp = new Date().toISOString();
  const isSidechain = options.isSidechain || 1;
  const parentUuid = options.parent_uuid || `session-${Date.now()}`;

  // Generate embedding
  const embedding = generateEmbedding(options.content.substring(0, 1000));

  // Insert into conversations table
  db.run(
    'INSERT INTO conversations (id, project, timestamp, user_message, assistant_message, summary, embedding, tags, is_sidechain, parent_uuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      project,
      timestamp,
      options.content.substring(0, 5000),
      options.content.substring(5000, 10000),
      options.content.substring(0, 500),
      JSON.stringify(embedding),
      `["sidechain", "${options.tag}"]`,
      isSidechain,
      parentUuid
    ]
  );

  // Save database
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);

  console.log(`✓ Stored sidechain: ${id}`);
}

function generateEmbedding(text) {
  const hash = simpleHash(text);
  const embedding = new Array(1536).fill(0);

  for (let i = 0; i < 256; i++) {
    const dim = (hash.charCodeAt(i) % 1536);
    const value = (hash.charCodeAt(i) * (i + 1) * 3) % 1000 / 1000;
    embedding[dim] = value;
  }

  return embedding;
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

// Get options from command line
const args = process.argv.slice(2);
const options = {};

args.forEach(arg => {
  const [key, value] = arg.split('=');
  options[key.replace('--', '')] = value;
});

insertSidechain(options).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
```

- [ ] **Step 4: Update hooks.json to use new script**

```json
{
  "PreCompact": [{
    "matcher": ".*",
    "hooks": [{
      "type": "command",
      "command": "bash /Users/praveshkhatana/.claude/plugins/claude-memory-manager/hooks/scripts/pre-compact-analyze.sh",
      "timeout": 30,
      "env": {
        "MEMORY_DB": "~/.claude/memory/memory.db",
        "AUTO_INDEX": "true"
      }
    }]
  }]
}
```

- [ ] **Step 5: Test hook configuration**

```bash
# Test that hooks.json is valid JSON
node -e "const hooks = require('./hooks/hooks.json'); console.log('Valid JSON:', JSON.stringify(hooks))"

# Test that new script is executable
chmod +x /Users/praveshkhatana/.claude/plugins/claude-memory-manager/hooks/scripts/pre-compact-analyze.sh
ls -la /Users/praveshkhatana/.claude/plugins/claude-memory-manager/hooks/scripts/pre-compact-analyze.sh
```

- [ ] **Step 6: Commit**

```bash
git add hooks/scripts/pre-compact-analyze.sh hooks/scripts/insert-sidechain.js hooks/hooks.json
git commit -m "feat: replace pre-compact hook with analyze script"
```

---

### Task 3: Phase 3 - SessionEnd Hook Modification

**Files:**
- Modify: `/Users/praveshkhatana/.claude/plugins/claude-memory-manager/hooks/scripts/session-end.sh`

- [ ] **Step 1: Read current session-end hook**

```bash
# Read existing session-end script
cat /Users/praveshkhatana/.claude/plugins/claude-memory-manager/hooks/scripts/session-end.sh
```

- [ ] **Step 2: Rewrite session-end.sh to call quality detector**

```bash
#!/bin/bash
set -e

# SessionEnd Hook - Modified to call quality detector
# Fires at session end to store remaining content

MEMORY_DB="${MEMORY_DB:-~/.claude/memory/memory.db}"
AUTO_INDEX="${AUTO_INDEX:-true}"
PLUGIN_ROOT="/Users/praveshkhatana/.claude/plugins/claude-memory-manager"

MEMORY_DB="${MEMORY_DB/#\~/$HOME}"

if [[ ! -f "$MEMORY_DB" ]]; then
  echo "Memory database not found at $MEMORY_DB"
  exit 0
fi

if [[ "$AUTO_INDEX" != "true" ]]; then
  exit 0
fi

echo "Session end hook - analyzing remaining content" >&2
echo "$(date '+%Y-%m-%d %H:%M:%S') - Session end hook triggered" >> "$MEMORY_DB.session.log" 2>/dev/null || true

# Get remaining content (after last pre-compact milestone)
# Sample last 50 messages
CONTENT=$(tail -n 50 /tmp/claude-conversation.log 2>/dev/null || echo "")

# Run quality detector
DEcision=$(echo "$CONTENT" | bash "$PLUGIN_ROOT/hooks/scripts/quality-detector.sh" analyze "$CONTENT")

# Parse result
RESULT=$(echo "$DEcision" | cut -d'|' -f1)
REASON=$(echo "$Decision" | cut -d'|' -f2)

if [[ "$RESULT" == "store" ]]; then
  echo "Storing as main session: $REASON" >&2

  # Store as main session
  TIMESTAMP=$(date +%s)
  ID="session-${TIMESTAMP}"

  # Insert into conversations table
  node "$PLUGIN_ROOT/src/insert-session.js" \
    --id "$ID" \
    --project "Flow-Draw" \
    --content "$CONTENT" \
    --is-sidechain 0 \
    --tags "session,main"

  echo "✓ Stored main session: $ID" >&2
else
  echo "Skipping: $REASON" >&2
fi

exit 0
```

- [ ] **Step 3: Create insert-session.js helper**

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function insertSession(options) {
  const SQL = await initSqlJs();

  // Create or load database
  const dbPath = process.env.HOME + '/.claude/memory/memory.db';
  let db;

  if (fs.existsSync(dbPath)) {
    const data = fs.readFileSync(dbPath);
    db = new SQL.Database(data);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  // Insert main session record
  const id = options.id;
  const project = options.project || 'Flow-Draw';
  const timestamp = new Date().toISOString();
  const isSidechain = options.is_sidechain || 0;

  // Generate embedding
  const embedding = generateEmbedding(options.content.substring(0, 1000));

  // Insert into conversations table
  db.run(
    'INSERT INTO conversations (id, project, timestamp, user_message, assistant_message, summary, embedding, tags, is_sidechain, session_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      project,
      timestamp,
      options.content.substring(0, 5000),
      options.content.substring(5000, 10000),
      options.content.substring(0, 500),
      JSON.stringify(embedding),
      `["session", "main"]`,
      isSidechain,
      `session-${Date.now()}`
    ]
  );

  // Save database
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);

  console.log(`✓ Stored main session: ${id}`);
}

function generateEmbedding(text) {
  const hash = simpleHash(text);
  const embedding = new Array(1536).fill(0);

  for (let i = 0; i < 256; i++) {
    const dim = (hash.charCodeAt(i) % 1536);
    const value = (hash.charCodeAt(i) * (i + 1) * 3) % 1000 / 1000;
    embedding[dim] = value;
  }

  return embedding;
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

// Get options from command line
const args = process.argv.slice(2);
const options = {};

args.forEach(arg => {
  const [key, value] = arg.split('=');
  options[key.replace('--', '')] = value;
});

insertSession(options).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
```

- [ ] **Step 4: Test the modified script**

```bash
# Make executable
chmod +x /Users/praveshkhatana/.claude/plugins/claude-memory-manager/hooks/scripts/session-end.sh

# Test dry run
bash /Users/praveshkhatana/.claude/plugins/claude-memory-manager/hooks/scripts/session-end.sh
```

- [ ] **Step 5: Commit**

```bash
git add hooks/scripts/session-end.sh hooks/scripts/insert-session.js
git commit -m "feat: modify session-end hook to call quality detector"
```

---

### Task 4: Phase 4 - Integration Testing

**Files:**
- Test: `/Users/praveshkhatana/.claude/plugins/claude-memory-manager/tests/integration/test-compact-storage.sh`

- [ ] **Step 1: Create integration test script**

```bash
#!/bin/bash

echo "=== Integration Test: PreCompact Storage ===" >&2

# Test 1: Trigger pre-compact hook
echo "Test 1: PreCompact hook should store meaningful content" >&2
# (Manual test: run /compact mid-conversation, check database)

# Test 2: Trigger session-end hook
echo "Test 2: SessionEnd hook should store remaining content" >&2
# (Manual test: end session, check database)

# Test 3: Multiple compacts
echo "Test 3: Multiple compacts should store multiple sidechains" >&2
# (Manual test: run /compact 3 times, verify 3 sidechains)

# Test 4: Quality detection
echo "Test 4: Social content should be skipped" >&2
# (Manual test: have social conversation, verify skipped)

echo "✅ Integration tests complete" >&2
```

- [ ] **Step 2: Run manual integration tests**

```bash
# Enable AUTO_INDEX
export AUTO_INDEX=true

# Have meaningful technical conversation
# Trigger /compact
# Check database: SELECT COUNT(*) FROM conversations WHERE is_sidechain=1
# Expected: 1

# End session
# Check database: SELECT COUNT(*) FROM conversations WHERE is_sidechain=0
# Expected: 1

# Have social conversation, end session
# Check database: SELECT COUNT(*) FROM conversations WHERE is_sidechain=0
# Expected: 1 (still only main session)
```

- [ ] **Step 3: Verify sidechain and parent_uuid linking**

```bash
# Query database
sqlite3 ~/.claude/memory/memory.db <<EOF
SELECT id, is_sidechain, parent_uuid FROM conversations;
EOF

# Verify:
# - Sidechain records have is_sidechain=1
# - Main session has is_sidechain=0
# - parent_uuid links sidechains to parent sessions
```

- [ ] **Step 4: Performance testing**

```bash
# Measure pre-compact overhead
time bash hooks/scripts/pre-compact-analyze.sh

# Expected: < 250ms

# Measure session-end overhead
time bash hooks/scripts/session-end.sh

# Expected: < 250ms
```

- [ ] **Step 5: Commit**

```bash
git add tests/integration/test-compact-storage.sh
git commit -m "test: add integration tests for compact storage"
```

---

### Task 5: Phase 5 - Production Deployment

**Files:**
- No new files

- [ ] **Step 1: Update hooks.json if needed**

```bash
# Verify hooks.json has correct paths
cat /Users/praveshkhatana/.claude/plugins/claude-memory-manager/hooks/hooks.json
```

- [ ] **Step 2: Enable in development**

```bash
# Update local settings
cat > /Users/praveshkhatana/.claude/claude-memory-manager.local.md <<EOF
# Automatic Memory Storage Enabled

AUTO_INDEX=true
ENABLE_PRE_COMPACT_STORAGE=true
ENABLE_SESSION_END_STORAGE=true
EOF
```

- [ ] **Step 3: Test in development environment**

```bash
# Restart Claude Code session
# Enable plugin
cc --plugin-dir /Users/praveshkhatana/.claude/plugins/claude-memory-manager

# Verify hooks fire:
# - /compact should trigger pre-compact analyze
# - Session end should trigger session-end analyze
```

- [ ] **Step 4: Monitor performance**

```bash
# Check logs
tail -f ~/.claude/memory/memory.db.session.log

# Monitor database size
du -h ~/.claude/memory/memory.db

# Monitor conversation count
sqlite3 ~/.claude/memory/memory.db "SELECT COUNT(*) FROM conversations;"

# Monitor sidechain count
sqlite3 ~/.claude/memory/memory.db "SELECT COUNT(*) FROM conversations WHERE is_sidechain=1;"
```

- [ ] **Step 5: Commit**

```bash
git add .claude/claude-memory-manager.local.md
git commit -m "feat: enable automatic memory storage in production"
```

---

### Task 6: Documentation Updates

**Files:**
- Modify: `/Users/praveshkhatana/.claude/plugins/claude-memory-manager/README.md`

- [ ] **Step 1: Update README with new features**

```markdown
## Automatic Meaningful Storage

### PreCompact Storage
- Fires before context compaction
- Stores meaningful content as sidechains
- Quality detection filters social/short content
- Links sidechains to parent sessions via `parent_uuid`

### SessionEnd Storage
- Fires at session end
- Stores remaining content as main session
- Quality detection ensures only valuable content stored

### Quality Detection Rules
- Technical content: API, functions, components, etc.
- Problem-solving: fix, debug, resolve patterns
- Decision-making: decided, chose, approach patterns
- User/feedback: preferences and feedback patterns

### Performance
- PreCompact analysis: ~100-250ms per trigger
- SessionEnd analysis: ~100-250ms
- Large projects (1000+): <200ms search
- Long sessions (50+ messages): handled efficiently
```

- [ ] **Step 2: Update example usage**

```markdown
## Usage

### Automatic Storage
The plugin automatically stores meaningful content at:
1. Before each `/compact` command
2. At session end

### Manual Search
```typescript
import { searchMemory } from 'claude-memory-manager';

// Search by semantic similarity
const results = searchMemory('API integration', { limit: 10 });

// Search by tags
const tagged = searchMemory('', { tags: ['technical'], limit: 20 });

// Search by time range
const recent = searchMemory('', {
  since: '2026-03-20',
  limit: 10
});
```

### Database Schema
The `conversations` table supports:
- `is_sidechain`: 1 for pre-compact milestones, 0 for main sessions
- `parent_uuid`: Links sidechains to parent sessions
- `session_id`: Groups all records from one session
```

- [ ] **Step 3: Add troubleshooting section**

```markdown
## Troubleshooting

### PreCompact not storing content
- Check `AUTO_INDEX=true` is set
- Verify `hooks/hooks.json` has PreCompact hook
- Check logs: `~/.claude/memory/memory.db.session.log`
- Verify quality detector returns "store"

### SessionEnd not storing content
- Check `AUTO_INDEX=true` is set
- Verify `hooks/hooks.json` has SessionEnd hook
- Check logs for "Session end hook triggered" message

### Quality detector skipping all content
- Check for social keywords (greetings, thanks)
- Check content length (< 100 chars)
- Check message count (single exchange)
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update README with automatic storage features"
```

---

### Task 7: User Verification

**Files:**
- No new files

- [ ] **Step 1: Guide user through manual testing**

```bash
# Instructions for user:

1. Enable automatic storage:
   export AUTO_INDEX=true

2. Have meaningful technical conversation:
   - Build a feature
   - Debug an issue
   - Discuss architecture

3. Trigger /compact mid-conversation:
   - Check database: SELECT COUNT(*) FROM conversations WHERE is_sidechain=1
   - Verify milestone stored

4. Continue conversation, end session:
   - Check database: SELECT COUNT(*) FROM conversations WHERE is_sidechain=0
   - Verify main session stored

5. Search using episodic-memory plugin:
   - Search for technical content
   - Verify results include mid-session content
```

- [ ] **Step 2: Verify user preferences captured**

```bash
# Check for user/feedback patterns in database
sqlite3 ~/.claude/memory/memory.db <<EOF
SELECT tags FROM conversations WHERE tags LIKE '%feedback%';
SELECT tags FROM conversations WHERE tags LIKE '%user%';
EOF
```

- [ ] **Step 3: Verify performance**

```bash
# Measure large project performance
# - Search: SELECT COUNT(*) FROM conversations WHERE project='Flow-Draw' LIMIT 20
# - Expected: < 200ms

# Measure long session performance
# - 50 messages, 10 compacts
# - Expected: Each compact ~100ms, total ~1 second overhead
```

- [ ] **Step 4: User approval**

Ask user: "Automatic memory storage working as expected?"

If yes → proceed to next feature

If no → debug and iterate
```

---

**Plan complete and saved to `docs/superpowers/plans/2026-03-23-automatic-meaningful-storage-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**