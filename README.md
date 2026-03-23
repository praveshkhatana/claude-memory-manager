# Claude Memory Manager Plugin

> Lightweight embedded memory plugin for Claude Code that stores and searches conversation history.

## Overview

The `claude-memory-manager` plugin preserves conversation history in an embedded SQLite database. It automatically saves conversation exchanges with metadata (project, timestamp, summary) and provides search functionality to retrieve relevant past conversations.

## Features

- ✅ **Conversation Storage** - Automatically saves conversation exchanges with metadata
- ✅ **Memory Search** - Search conversations by keyword in user messages
- ✅ **Project Organization** - Tag conversations by project name
- ✅ **Status Tracking** - Monitor memory usage and statistics
- ✅ **Silent Operation** - No user intervention required
- ✅ **Pure JavaScript** - No external server needed

## Installation

1. **Clone or download plugin** to your Claude Code plugins directory:
   ```bash
   /Users/praveshkhatana/.claude/plugins/
   ```

2. **Enable the plugin** in Claude Code settings:
   ```json
   {
     "enabledPlugins": {
       "claude-memory-manager@thedotmack": true
     }
   }
   ```

3. **Restart Claude Code** to load the plugin
4. **Initialize database** (automatic on first use):
   ```bash
   # Database will be created at ~/.claude/memory/memory.db
   ```

## Usage

### Automatic Conversation Saving

No user action required. The plugin automatically saves conversation exchanges during your Claude Code sessions.

### Searching Conversations

Search for past conversations by keywords:

```javascript
// Plugin automatically saves conversations
// To search, the plugin exports these functions:

// Search conversations by keyword
const results = searchMemory("POD architecture");

// Save a conversation manually
saveConversation({
  id: "conversation-id",
  project: "Flow-Draw",
  timestamp: new Date().toISOString(),
  userMessage: "User message here",
  assistantMessage: "Assistant response here",
  summary: "Conversation summary",
  tags: ["wasm", "rust"]
});
```

### Memory Status

Check memory database status:

```javascript
const status = getMemoryStatus();
// Returns: {
//   total: number,
//   withEmbedding: number,
//   withTags: number,
//   projects: [{ project: string, count: number }]
// }
```

### Database Location

Memory database stored at: `~/.claude/memory/memory.db`

## Architecture

### Core Components

**1. Memory Database Layer**
- File-based SQLite database
- Tables: `conversations`, `tags`, `tag_relations`
- Indexes: timestamp-based ordering

**2. Storage Strategy**
- Automatic conversation saving
- Metadata: id, project, timestamp, user_message, assistant_message, summary, tags
- Tags stored as JSON array in conversations table

**3. Retrieval Layer**
- `searchMemory(query, options)` - Search conversations by keyword
- `saveConversation(exchange)` - Manually save a conversation
- `getMemoryStatus()` - Get database statistics

**4. Silent Operation**
- No user configuration required
- Runs in background during Claude Code sessions
- Automatic database initialization

### Data Flow

**Saving Flow:**
```
Conversation Exchange
    ↓
Plugin intercepts exchange
    ↓
Extract metadata (project, timestamp)
    ↓
Generate summary (optional)
    ↓
Store in database
    ↓
Done (no user intervention)
```

**Retrieval Flow:**
```
User queries (via searchMemory)
    ↓
Search database by keyword
    ↓
Return matching conversations
    ↓
Present results with date metadata
```

## Configuration

### Settings.json

No configuration required. Plugin works out of the box.

### Database Location

Default: `~/.claude/memory/memory.db`

Can be changed by setting environment variable:
```bash
export MEMORY_DB_PATH=/path/to/custom/memory.db
```

## Development

### Project Structure

```
claude-memory-manager/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── src/
│   └── index.ts             # TypeScript source
├── dist/
│   └── index.js            # Compiled JavaScript
├── skills/
│   └── memory-init/
│       └── SKILL.md         # Initialization guide
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── README.md                # This file
└── test-plugin.mjs          # Test script
```

### Building

```bash
npm install
npm run build
```

### Testing

Run the test suite:
```bash
node test-plugin.mjs
```

## Troubleshooting

### Database Not Created

- Check permissions on `~/.claude/memory/` directory
- Ensure Claude Code can write to home directory
- Check database exists: `ls -la ~/.claude/memory/memory.db`

### Conversations Not Being Saved

- Plugin enabled in settings.json
- Restart Claude Code after enabling
- Check database creation in plugin logs

### Search Not Finding Results

- Ensure database contains conversations
- Check keyword matches user_message field
- Use `getMemoryStatus()` to verify data

## License

MIT

## Author

Claude Memory Plugin Developer

## Repository

https://github.com/user/claude-memory-manager

## Keywords

memory, context, persistence, search, indexing