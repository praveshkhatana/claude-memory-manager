#!/usr/bin/env node

/**
 * Script to restore project memory from markdown files to the new memory database
 * CommonJS version for sql.js compatibility
 */

console.log('='.repeat(50));
console.log('RESTORE-MEMORY.CJS SCRIPT START');
console.log('='.repeat(50));

const initSqlJs = require('sql.js');
console.log('✓ sql.js loaded');

const fs = require('fs');
console.log('✓ fs loaded');

const DB_PATH = process.env.HOME + '/.claude/memory/memory.db';

function restoreMemory() {
  console.log('✓ restoreMemory() called');
  console.log('✓ initSqlJs() calling...');
  return initSqlJs().then(SQL => {
    console.log('✓ initSqlJs().then() resolved');
    console.log('✓ Creating database...');
    // Load or create database
    let db;
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH);
      db = new SQL.Database(data);
    } else {
      db = new SQL.Database();
    }

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON;');

    // Memory files to restore
    const memoryFiles = [
      {
        path: '/Users/praveshkhatana/.claude/projects/-Users-praveshkhatana-Desktop-projects-Flow-Draw/memory/project-architecture-wasm-rust.md',
        tags: ['project', 'architecture', 'wasm', 'rust', 'ip-protection'],
        project: 'Flow-Draw'
      },
      {
        path: '/Users/praveshkhatana/.claude/projects/-Users-praveshkhatana-Desktop-projects-Flow-Draw/memory/documentation-optimization-rules.md',
        tags: ['documentation', 'optimization', 'token-saving'],
        project: 'Flow-Draw'
      }
    ];

    let restored = 0;

    for (const file of memoryFiles) {
      console.log('\n=== Restoring: ' + file.path + ' ===');
      console.log('File exists:', fs.existsSync(file.path));

      // Read file content
      const content = fs.readFileSync(file.path, 'utf-8');

      // Extract title from first line after ---
      const lines = content.split('\n');
      let title = 'Memory file';
      for (const line of lines) {
        if (line.startsWith('#')) {
          title = line.replace(/^#\s*/, '').trim();
          break;
        }
      }

      // Create embedding (simple hash for demonstration)
      const embedding = generateEmbedding(content.substring(0, 1000));
      console.log('  Generated embedding array length: ' + embedding.length);

      // Save as conversation
      const id = 'restore-' + Date.now() + '-' + Math.random().toString(36).substring(7);

      // Convert embedding to BLOB
      const embeddingArray = Array.isArray(embedding) ? embedding.map(v => Number(v) || 0) : [];
      const embeddingStr = embeddingArray.join(',');

      // Convert tags to JSON string
      const tagsStr = JSON.stringify(file.tags);

      // Check all values and handle varying content lengths
      const userMessage = String(content.substring(0, 5000) || '');
      const assistantMessage = String(content.substring(5000) || '');
      const values = [
        String(id || ''),
        String(file.project || ''),
        String(new Date().toISOString() || ''),
        userMessage,
        assistantMessage,
        String(title || ''),
        embeddingStr, // Still store as string, will convert to BLOB in plugin
        tagsStr
      ];

      console.log('  Checking values:');
      values.forEach((v, i) => {
        const displayValue = (v && v.length > 100) ? v.toString().substring(0, 100) + '...' : v;
        console.log('    Value ' + i + ':', displayValue, 'type:', typeof v);
        if (v === undefined) {
          console.log('    ERROR: Value ' + i + ' is undefined!');
        }
      });

      db.run(
        'INSERT INTO conversations (id, project, timestamp, user_message, assistant_message, summary, embedding, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        values
      );

      // Save tags - FIXED: Use db.exec() for SELECT to get ID
      for (const tag of file.tags) {
        // Try to insert tag with ON CONFLICT DO NOTHING (creates if doesn't exist)
        db.run('INSERT INTO tags (name, created_at) VALUES (?, datetime("now")) ON CONFLICT(name) DO NOTHING', [tag]);

        // Get the tag ID using db.exec() instead of db.prepare().get()
        // db.exec() returns structured results: [{ columns: [...], values: [[row1, row2, ...]] }]
        const execResult = db.exec('SELECT id FROM tags WHERE name = ? LIMIT 1', [tag]);
        let tagId = null;

        if (execResult && execResult.length > 0 && execResult[0].values && execResult[0].values.length > 0) {
          const row = execResult[0].values[0];
          if (Array.isArray(row) && row.length > 0) {
            tagId = row[0];
          }
        }

        // Create relation if we have a valid tag ID
        if (tagId) {
          db.run('INSERT INTO tag_relations (conversation_id, tag_id, created_at) VALUES (?, ?, datetime("now"))', [id, tagId]);
          console.log('  ✓ Created tag relation:', tag);
        } else {
          console.log('  ✗ Skipping tag (not in database):', tag);
        }
      }

      restored++;
      console.log('  ✓ Restored: ' + title);
    }

    // Save database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);

    console.log('\n✅ Restored ' + restored + ' conversations to memory database');
    console.log('Database location: ' + DB_PATH);
    console.log('\nDone!');
  }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

// Generate simple hash embedding
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

console.log('✓ Calling restoreMemory()...');
restoreMemory().catch(err => {
  console.error('ERROR in restoreMemory():', err.message);
  console.error(err.stack);
  process.exit(1);
});
