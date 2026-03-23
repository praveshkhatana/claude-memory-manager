# Claude Memory Manager - Quick Setup Guide

## ✅ Plugin is Now Enabled

The plugin has been configured and is ready to use!

## How to Use It

### 1. Automatic Conversation Saving

The plugin works **silently in the background**. Every conversation you have with Claude Code is automatically saved to the database:

- ✅ No configuration needed
- ✅ No user action required
- ✅ Works automatically during your sessions

### 2. Searching Past Conversations

When you need to reference previous conversations, use the plugin's functions:

```javascript
// Search for conversations about a topic
const results = searchMemory("POD architecture");

// Sample result:
// [
//   {
//     id: "conversation-id",
//     project: "Flow-Draw",
//     summary: "Conversation summary...",
//     date: "2026-03-22 18:04:16"
//   }
// ]
```

### 3. Check Memory Status

Monitor your memory usage:

```javascript
const status = getMemoryStatus();
console.log(status);
// {
//   total: 10,              // Total conversations
//   withEmbedding: 0,      // Conversations with embeddings
//   withTags: 10,           // Conversations with tags
//   projects: [             // Projects and their counts
//     { project: "Flow-Draw", count: 5 },
//     { project: "test-project", count: 3 }
//   ]
// }
```

### 4. Manually Save Conversations

If you want to save a conversation manually:

```javascript
saveConversation({
  id: "my-conversation-id",
  project: "Flow-Draw",
  timestamp: new Date().toISOString(),
  userMessage: "User message here",
  assistantMessage: "Assistant response here",
  summary: "Conversation summary",
  tags: ["wasm", "rust"]
});
```

## Database Location

The memory database is stored at:
```
~/.claude/memory/memory.db
```

This is a SQLite database that will be created automatically when you first use the plugin.

## Next Steps

1. **Restart Claude Code** to load the plugin
2. **Start a new conversation** - the plugin will begin saving automatically
3. **Use the plugin functions** when you need to reference past conversations

## Want to Test It?

Run the test script to verify everything works:

```bash
cd yourClaudePluginsDirectory
node test-plugin.mjs
```

Expected output:
```
✅ All tests passed!
```

## For Production and Distribution

See the `README.md` file for:
- Architecture details
- Development instructions
- Troubleshooting guide
- License and attribution

---

**Need help?** Check the `skills/memory-init/SKILL.md` for initialization guidance.