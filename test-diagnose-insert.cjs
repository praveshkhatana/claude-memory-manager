#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  console.log('=== Diagnosing INSERT Issues ===\n');

  // Test 1: Create table with different configurations
  console.log('1. Create tags table with different configurations\n');
  db.run('CREATE TABLE tags_debug (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, created_at TEXT)');
  console.log('✓ Table created');

  // Test 2: Insert with different methods
  console.log('\n2. Insert with INSERT OR IGNORE\n');
  const result1 = db.run('INSERT OR IGNORE INTO tags_debug (name, created_at) VALUES (?, ?)', ['test-tag', new Date().toISOString()]);
  console.log('Insert result:', result1);
  console.log('Last ID:', db.exec('SELECT last_insert_rowid()'));

  console.log('\n3. Check PRAGMA table_info\n');
  const info = db.exec('PRAGMA table_info(tags_debug)');
  console.log('Table info:', info);

  console.log('\n4. Select after insert\n');
  const stmt = db.prepare('SELECT * FROM tags_debug');
  const rows = stmt.get();
  console.log('Rows:', rows);
  console.log('Rows type:', typeof rows, 'Array.isArray:', Array.isArray(rows));

  console.log('\n5. Export database\n');
  const data = db.export();
  console.log('Exported:', data.length, 'bytes');
  console.log('Exported type:', typeof data);

  console.log('\n6. Try INSERT with RETURNING\n');
  try {
    const result2 = db.run('INSERT INTO tags_debug (name, created_at) VALUES (?, ?) RETURNING *', ['test-tag-2', new Date().toISOString()]);
    console.log('Insert result:', result2);
    const stmt2 = db.prepare('SELECT * FROM tags_debug');
    const rows2 = stmt2.get();
    console.log('Rows after RETURNING:', rows2);
  } catch (err) {
    console.log('✗ INSERT with RETURNING failed:', err.message);
  }

  console.log('\n7. Check database file exists\n');
  const fs = require('fs');
  const DB_PATH = process.env.HOME + '/.claude/memory/memory.db';
  console.log('DB exists:', fs.existsSync(DB_PATH));
  console.log('DB size:', fs.statSync(DB_PATH).size, 'bytes');

  console.log('\n✅ Diagnostics complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
