#!/usr/bin/env node

/**
 * Script to restore project memory from markdown files to the new memory database
 */

import initSqlJs from 'sql.js';
import fs from 'fs';

const DB_PATH = process.env.HOME + '/.claude/memory/memory.db';

async function restoreMemory() {
  const SQL = await initSqlJs();

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
      path: '/yourClaudeDirectory/projects/YOUR_PROJECT/memory/project-architecture-wasm-rust.md',
      tags: ['project', 'architecture', 'wasm', 'rust', 'ip-protection'],
      project: 'YOUR_PROJECT'
    },
    {
      path: '/yourClaudeDirectory/projects/YOUR_PROJECT/memory/documentation-optimization-rules.md',
      tags: ['documentation', 'optimization', 'token-saving'],
      project: 'YOUR_PROJECT'
    }
  ];

  let restored = 0;

  for (const file of memoryFiles) {
    console.log(`\nRestoring: ${file.path}`);

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
    console.log('  Generated embedding array length:', embedding.length);

    // Save as conversation
    const id = 'restore-' + Date.now() + '-' + Math.random().toString(36).substring(7);

    // Convert embedding to string
    const embeddingStr = Array.isArray(embedding) ? embedding.map(v => Number(v) || 0).join(',') : String(embedding || '');

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
      embeddingStr,
      tagsStr
    ];

    console.log('  Checking values:');
    values.forEach((v, i) => {
      console.log('    Value', i, ':', v, 'type:', typeof v);
      if (v === undefined) {
        console.log('    ERROR: Value', i, 'is undefined!');
      }
    });

    db.run(
      'INSERT INTO conversations (id, project, timestamp, user_message, assistant_message, summary, embedding, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      values
    );

    // Save tags
    for (const tag of file.tags) {
      // Get tag id (create if doesn't exist)
      const tagStmt = db.prepare('SELECT id FROM tags WHERE name = ?');
      const tagId = tagStmt.get(tag);
      if (!tagId) {
        db.run('INSERT INTO tags (name, created_at) VALUES (?, datetime("now"))', [tag]);
      }
      // Get tag id and create relation
      const tagInfo = db.prepare('SELECT id FROM tags WHERE name = ?').get(tag);
      const tagIdResult = tagInfo['id'];
      db.run('INSERT INTO tag_relations (conversation_id, tag_id, created_at) VALUES (?, ?, datetime("now"))', [id, tagIdResult]);
    }

    restored++;
    console.log(`  ✓ Restored: ${title}`);
  }

  // Save database
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);

  console.log(`\n✅ Restored ${restored} conversations to memory database`);
  console.log(`Database location: ${DB_PATH}`);
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

restoreMemory().catch(console.error);