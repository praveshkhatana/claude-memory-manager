#!/usr/bin/env node

const initSqlJs = require('sql.js');
const fs = require('fs');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  console.log('=== Creating Database Schema ===\n');

  // Create all tables
  db.run('CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, project TEXT, timestamp TEXT, user_message TEXT, assistant_message TEXT, summary TEXT, embedding TEXT, tags TEXT)');
  console.log('✓ Created conversations table');

  db.run('CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, created_at TEXT)');
  console.log('✓ Created tags table');

  db.run('CREATE TABLE IF NOT EXISTS tag_relations (conversation_id TEXT, tag_id INTEGER, created_at TEXT)');
  console.log('✓ Created tag_relations table');

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');
  console.log('✓ Enabled foreign keys');

  // Save database
  const data = db.export();
  const buffer = Buffer.from(data);
  const DB_PATH = process.env.HOME + '/.claude/memory/memory.db';
  fs.writeFileSync(DB_PATH, buffer);
  console.log('✓ Saved database to:', DB_PATH);

  console.log('\nSchema created successfully!');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
