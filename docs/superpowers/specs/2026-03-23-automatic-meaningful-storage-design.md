---
name: Automatic Meaningful Memory Storage
description: Design for capturing meaningful conversation content at critical points (PreCompact, SessionEnd) to preserve context and enable better future AI performance
type: design
version: 1.0.0
date: 2026-03-23
---

# Automatic Meaningful Memory Storage Design

## Overview

Capture meaningful conversation content at critical points (before compaction, at session end) to preserve context and enable better future AI performance. The system analyzes conversation quality, stores only high-value content, and uses the existing memory types (conversations, user, feedback) to maintain a lean but effective knowledge base.

**Problem Solved**: Long sessions with multiple compactions lose context. Critical decisions made before compaction are lost forever because the compressed context doesn't preserve the reasoning path.

**Solution**: Store meaningful content at compaction points (PreCompact hook) and session end using intelligent quality detection to maintain a searchable, efficient memory database.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Conversation                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ├───[ COMPACT TRIGGER ]───┐
                       │                        │
                       │              ┌─────────▼─────────┐
                       │              │  PreCompact Hook   │
                       │              │   fires BEFORE    │
                       │              │   compact        │
                       │              └──────────┬─────────┘
                       │                       │
              ┌──────────────▼──────────────┐
              │  Quality Detector   │
              │  (shared logic)    │
              └──────┬──────────────┘
                     │
       ┌──────────────┼───────────────┐
       │                          │
  [Meaningful?]  [Not Meaningful?]
       │                          │
       ▼                          ▼
┌──────────┐                  ┌────────────┐
│ Store as │                  │ Skip, log │
│ sidechain│                  │   reason   │
└─────┬────┘                  └────────────┘
      │
      ▼
┌──────────────────┐
│  SQLite DB    │
│ (conversations)│
└───────────────┘

┌────────────────────────────────────────┐
│       [ SESSION ENDS ]                │
└─────────────┬────────────────────────┘
              │
    ┌──────────▼─────────────┐
    │ SessionEnd Hook       │
    └──────────┬─────────────┘
               │
      ┌─────────▼──────────┐
      │ Quality Detector    │
      └─────────┬──────────┘
                │
          [Meaningful?] → Store as main session (is_sidechain=0)
```

### Components

1. **PreCompact Hook Script** (`hooks/scripts/pre-compact-analyze.sh`)
   - Runs BEFORE compaction (full context still available)
   - Calls shared quality detector
   - Stores as sidechain (`is_sidechain=1`) with `parent_uuid` linking
   - Captures user/feedback memories when detected

2. **SessionEnd Hook Script** (`hooks/scripts/session-end.sh`)
   - Modified from existing (currently only logs)
   - Calls shared quality detector for remaining content
   - Stores as main session (`is_sidechain=0`)

3. **Quality Detector Script** (`hooks/scripts/quality-detector.sh`)
   - Shared quality detection logic
   - Fast-path detection for clear cases
   - Sampling for performance with large content
   - Returns decision + tags + memory type

### Data Flow

```
Session Start
  ↓
[Conversation flows]
  ↓
User runs /compact
  ↓
PreCompact Hook fires (context intact)
  ↓
Quality Detector analyzes recent content
  ↓
Is meaningful?
  ├─ Yes → Store as sidechain milestone
  └─ No → Skip, log reason
  ↓
[More conversation]
  ↓
Another /compact
  ↓
PreCompact → Analyze → Store if meaningful (another sidechain)
  ↓
Session Ends
  ↓
SessionEnd Hook fires
  ↓
Quality Detector analyzes remaining content
  ↓
Store as main session if meaningful
```

### Database Schema (Existing)

The `conversations` table already supports this design:

```sql
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  project TEXT,
  timestamp TEXT,
  user_message TEXT,
  assistant_message TEXT,
  summary TEXT,
  embedding BLOB,
  tags TEXT,
  parent_uuid TEXT,        -- Links sidechains to sessions
  is_sidechain INTEGER DEFAULT 0,
  session_id TEXT,
  cwd TEXT,
  git_branch TEXT,
  claude_version TEXT,
  thinking_level TEXT,
  thinking_disabled INTEGER DEFAULT 0,
  thinking_triggers TEXT
);
```

- `is_sidechain=1`: PreCompact-stored milestones
- `is_sidechain=0`: SessionEnd-stored main sessions
- `parent_uuid`: Links sidechains to parent sessions
- `session_id`: Groups all records from one session

## Quality Detection Rules

### Store If ANY Condition Met

1. **Technical Content Present**
   - Code snippets: backticks, indented code blocks
   - File references: paths like `src/components/`, `lib/utils.ts`
   - Technical terms: API, function, component, service, etc.

2. **Problem-Solving Pattern**
   - Keywords: fix, resolve, solve, debug, troubleshoot
   - Pattern: error → investigation → resolution
   - Example: "Error: X... Tried Y... Solution: Z..."

3. **Decision-Making Pattern**
   - Keywords: decided, chose, approach, instead
   - Example: "Decided to use Redux instead of Context"
   - Trade-offs mentioned: pros, cons, better

4. **Content Length Threshold**
   - User + assistant messages >= 500 characters total
   - OR >= 3 message exchanges (user + assistant pairs)

### Skip If ALL Conditions Met

1. Pure social chat (greetings, thanks, how are you)
2. Single message exchange (one question, one answer)
3. No technical keywords or code references
4. Very short (< 100 characters total)

### User/Feedback Detection

Automatically detect and tag these patterns:

| Pattern | Memory Type | Tags | Example |
|---------|-------------|------|---------|
| "not X" / "don't do X" | `feedback` | `['feedback', 'avoid-X']` | "not mock DB" |
| "exactly" / "perfect" + positive | `feedback` | `['feedback', 'confirmed-good']` | "exactly right" |
| "I'm X expert" / "new to Y" | `user` | `['user', 'expertise-X']` | "React expert" |
| "prefer X over Y" | `user` | `['user', 'prefer-X']` | "prefer one bundled PR" |
| "stop doing X" | `feedback` | `['feedback', 'stop-X']` | "stop guessing" |

## Storage Logic

### PreCompact Storage

1. **Get Conversation Data**
   - Messages since last stored milestone
   - Current project, cwd, git branch, session_id
   - Available context (from Claude's hook environment)

2. **Run Quality Detector**
   - `quality-detector.sh analyze` → returns decision
   - Returns: `store|skip` + reason + tags + memory_type

3. **If Meaningful: Store as Sidechain**
   ```typescript
   {
     id: `milestone-${timestamp}`,
     project: "Flow-Draw",
     timestamp: "2026-03-23T10:30:00Z",
     is_sidechain: 1,
     parent_uuid: "session-abc-123",
     session_id: "session-xyz-789",
     ...content + metadata
   }
   ```

4. **If Not Meaningful: Skip**
   - Log reason: "Skip: pure social chat", "Skip: < 100 chars", etc.

### SessionEnd Storage

1. **Get Remaining Content**
   - Messages after last PreCompact
   - Final session metadata

2. **Run Quality Detector**

3. **Store as Main Session**
   ```typescript
   {
     id: `session-${timestamp}`,
     project: "Flow-Draw",
     timestamp: "2026-03-23T14:00:00Z",
     is_sidechain: 0,
     session_id: "session-xyz-789",
     ...content + metadata
   }
   ```

## Performance Optimizations

### 1. Content Sampling

Instead of analyzing all messages since last store:

```
Sample: Last 50 messages OR last 10K characters (whichever comes first)
Rationale: Recent content most relevant for decisions
```

### 2. Fast-Path Detection

Two-pass approach:

```
First pass: Quick keyword check (100ms max)
- Technical keywords found → store immediately
- Clearly social → skip immediately

Second pass: Deep analysis (only if first pass ambiguous)
- Full quality detection rules
```

### 3. Caching Quality Decisions

```
Cache: { last_quality_check_time, last_result }

If < 2 minutes since last check:
  → Reuse cached decision (store/skip)

Rationale: User's "meaningful" patterns consistent within session
```

### 4. Database Query Optimization

```
Search defaults: LIMIT 20
Always filter by: project + tags + time range
Indexed columns: timestamp, project, embedding
```

### 5. Periodic Cleanup (Future Enhancement)

```
After 30 days: Consolidate related sidechains
Keep: Latest N sidechains per session
Older: Merge into summarized "session memories"
```

### Performance Estimates

| Operation | Time | Notes |
|----------|------|-------|
| PreCompact analysis | 50-200ms | Sampling + fast-path |
| Database store | 10-50ms | Simple INSERT |
| Session search | 50-200ms | With filters + LIMIT |
| **Total per compact** | ~100-250ms | Acceptable overhead |

**Large Project Performance (1000+ conversations):**
- Search returns top 10 results in < 200ms ✓
- Only meaningful content stored → lean database ✓

**Long Session Performance (50 messages, 10 compacts):**
- Each compact: ~100ms analysis ✓
- Total overhead: ~1 second ✓ (negligible)

## Implementation Plan

### Phase 1: Quality Detection

1. Create `hooks/scripts/quality-detector.sh`
   - Implement detection functions (technical, problem-solving, decision-making)
   - Implement user/feedback detection
   - Implement sampling logic
   - Implement fast-path detection

### Phase 2: PreCompact Hook

1. Replace `hooks/scripts/pre-compact.sh` with `pre-compact-analyze.sh`
   - Call quality detector
   - Store as sidechain if meaningful
   - Handle errors gracefully (don't block compact)

### Phase 3: SessionEnd Hook

1. Modify `hooks/scripts/session-end.sh`
   - Call quality detector for remaining content
   - Store as main session if meaningful
   - Update session metadata

### Phase 4: Testing

1. Unit test each script with sample conversations
2. Integration test with simulated compaction
3. Manual test with real conversation
4. Performance test with large/long sessions

### Phase 5: Deployment

1. Update hooks.json with new script paths
2. Test in development environment
3. Enable in production
4. Monitor performance and adjust

## Testing Strategy

### Unit Tests

- **quality-detector.sh**:
  - Should store: technical content, problem-solving, decision-making
  - Should skip: pure social, single messages, very short
  - Tag detection: user preferences, feedback patterns

### Integration Tests

- **PreCompact trigger**:
  - Verify hook fires before compact
  - Verify sidechain stored with `is_sidechain=1`
  - Verify parent_uuid links correctly

- **SessionEnd trigger**:
  - Verify hook fires after session ends
  - Verify main session stored with `is_sidechain=0`

- **Multiple compacts**:
  - Test session with 3 compacts
  - Verify 3 sidechains + 1 main session stored
  - Verify search returns results from all

### Manual Testing

1. Enable AUTO_INDEX=true in `.claude/claude-memory-manager.local.md`
2. Have meaningful technical conversation
3. Trigger `/compact` mid-conversation
4. Verify database has milestone record
5. Continue conversation, end session
6. Verify database has main session record
7. Search using episodic-memory plugin
8. Verify results include mid-session content

### Edge Cases

| Case | Expected Behavior |
|------|-----------------|
| No meaningful content | Skip all stores, log reasons |
| PreCompact hook fails | Log error, don't block compact |
| Database locked | Retry 3x, log, continue if fails |
| Multiple compacts | Store sidechains for each meaningful |
| Very long content | Sample last 50 messages / 10K chars |

## Success Criteria

- ✅ Meaningful content stored before compaction (no context loss)
- ✅ Pure social/short content skipped (database remains lean)
- ✅ User preferences and feedback automatically captured
- ✅ PreCompact overhead < 250ms per trigger
- ✅ Search returns relevant results in < 200ms
- ✅ Large projects (1000+ conversations) remain performant
- ✅ Long sessions (50+ messages, 10 compacts) handle efficiently
