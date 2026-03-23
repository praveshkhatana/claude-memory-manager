# Claude Memory Manager - Distribution & Publishing Guide

## Option A: GitHub Repository (Recommended)

The easiest way to share your plugin with others is to host it on GitHub.

### Steps:

1. **Create GitHub Repository**
   ```bash
   # Go to GitHub and create a new repository
   # Name: claude-memory-manager
   # Description: Lightweight memory plugin for Claude Code
   # Set as public or private as needed
   ```

2. **Initialize Git Repository (if not already done)**
   ```bash
   cd /Users/praveshkhatana/.claude/plugins/claude-memory-manager

   # Initialize git
   git init

   # Add all files
   git add .

   # First commit
   git commit -m "feat: initial release of claude-memory-manager plugin"
   ```

3. **Connect to GitHub**
   ```bash
   # Add GitHub remote
   git remote add origin https://github.com/YOUR_USERNAME/claude-memory-manager.git

   # Push to GitHub (create the repository first on GitHub)
   git branch -M main
   git push -u origin main
   ```

4. **Share with Others**
   - Share the GitHub URL: `https://github.com/YOUR_USERNAME/claude-memory-manager`
   - Users can clone it:
     ```bash
     cd /path/to/claude/plugins
     git clone https://github.com/YOUR_USERNAME/claude-memory-manager.git
     ```

### Advantages:
- ✅ Free hosting
- ✅ Version control
- ✅ Easy cloning
- ✅ Community visibility

---

## Option B: Manual Distribution

Share the plugin files directly with others.

### Steps:

1. **Create Distribution Package**
   ```bash
   cd /Users/praveshkhatana/.claude/plugins

   # Zip the plugin directory
   zip -r claude-memory-manager.zip claude-memory-manager
   ```

2. **Share the Zip File**
   - Email, Slack, Discord, etc.
   - Cloud storage (Google Drive, Dropbox)
   - Direct file transfer

3. **User Installation**
   ```bash
   # Unzip to plugins directory
   cd /path/to/claude/plugins
   unzip /path/to/claude-memory-manager.zip
   ```

4. **Enable in settings.json**
   ```json
   {
     "enabledPlugins": {
       "claude-memory-manager@thedotmack": true
     }
   }
   ```

### Advantages:
- ✅ Simple one-file transfer
- ✅ Works offline
- ✅ No repository needed

---

## Option C: Marketplace (thedotmack)

Publish to the thedotmack marketplace for broader distribution.

### Steps:

1. **Prepare Plugin**
   ```bash
   cd /Users/praveshkhatana/.claude/plugins/claude-memory-manager

   # Ensure plugin.json is correct
   cat .claude-plugin/plugin.json
   ```

2. **Create Marketplace Entry**
   - Visit: https://marketplace.thedotmack.com/
   - Click "Publish Plugin"
   - Enter plugin details:
     - Name: `claude-memory-manager`
     - Description: Lightweight memory plugin for Claude Code
     - Keywords: memory, context, persistence, search
     - License: MIT
     - Author: Your name/organization

3. **Upload Plugin**
   - Upload the plugin directory
   - Ensure `plugin.json` and `dist/index.js` are present

4. **Share Link**
   - Users can install via:
     ```bash
     cc --plugin marketplace install claude-memory-manager
     ```

### Advantages:
- ✅ Automatic updates
- ✅ Community discovery
- ✅ Easy installation
- ✅ Version management

---

## Option D: npm Package

Create an npm package for programmatic installation.

### Steps:

1. **Create package.json**
   ```bash
   cd /Users/praveshkhatana/.claude/plugins/claude-memory-manager

   # Use the existing package.json
   cat package.json
   ```

2. **Publish to npm**
   ```bash
   # Login to npm
   npm login

   # Publish package
   npm publish
   ```

3. **Installation**
   ```bash
   # Users install via:
   npm install -g claude-memory-manager
   ```

### Advantages:
- ✅ Standard package management
- ✅ Dependency resolution
- ✅ Version pinning
- ✅ Automated updates

---

## Recommended Distribution Strategy

**For immediate sharing:** Use **Option B (Manual)** for quick distribution to colleagues.

**For community sharing:** Use **Option A (GitHub)** to create a repository for broader access.

**For production deployment:** Use **Option C (Marketplace)** for thedotmack users.

## Plugin Metadata

Your plugin manifest at `.claude-plugin/plugin.json` includes:

```json
{
  "name": "claude-memory-manager",
  "version": "1.0.0",
  "description": "Lightweight memory plugin for Claude Code...",
  "author": {
    "name": "Claude Memory Plugin Developer",
    "email": "developer@example.com",
    "url": "https://github.com/user/claude-memory-manager"
  },
  "homepage": "https://github.com/user/claude-memory-manager",
  "repository": "https://github.com/user/claude-memory-manager",
  "license": "MIT",
  "keywords": ["memory", "context", "persistence", "search", "indexing"]
}
```

Update these fields with your information before publishing!

## Files to Include in Distribution

Always include these files:
- ✅ `.claude-plugin/plugin.json` - Plugin manifest (required)
- ✅ `dist/index.js` - Compiled JavaScript (required)
- ✅ `README.md` - Documentation (recommended)
- ✅ `package.json` - Dependencies (recommended)
- ✅ `tsconfig.json` - TypeScript config (if building)
- ✅ `skills/*/SKILL.md` - Skills documentation (if applicable)

## Testing Before Distribution

Before sharing, verify everything works:

```bash
# 1. Build the plugin
npm run build

# 2. Test the plugin
node test-plugin.mjs

# 3. Verify compiled output
ls -la dist/index.js

# 4. Check plugin.json
cat .claude-plugin/plugin.json
```

## Post-Distribution Steps

After sharing, users need to:

1. **Install the plugin**
   ```bash
   # Manual distribution
   unzip /path/to/claude-memory-manager.zip

   # GitHub
   git clone https://github.com/YOUR_USERNAME/claude-memory-manager.git

   # Marketplace
   cc --plugin marketplace install claude-memory-manager
   ```

2. **Enable in settings.json**
   ```json
   {
     "enabledPlugins": {
       "claude-memory-manager@thedotmack": true
     }
   }
   ```

3. **Restart Claude Code**
   ```bash
   # Close and reopen Claude Code
   ```

4. **Initialize database** (automatic on first use)
   ```bash
   # Just start using it - database creates automatically
   ```

---

**Need help with any distribution method?** Ask and I can walk you through the specific steps!