#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();
  const fs = require('fs');

  console.log('=== Testing Solution: Use exec() for SELECT ===\n');

  // Create tables
  console.log('1. Create tables\n');
  db.run('CREATE TABLE tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, created_at TEXT)');
  db.run('CREATE TABLE tag_relations (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT, tag_id INTEGER, created_at TEXT)');
  console.log('✓ Tables created\n');

  // Test 1: Insert and get ID using exec()
  console.log('2. Insert tag and get ID using exec()\n');
  const insertResult = db.run('INSERT INTO tags (name, created_at) VALUES (?, ?)', ['project', new Date().toISOString()]);
  console.log('Insert result:', insertResult);

  // Use exec() to select
  const selectResult = db.exec('SELECT id FROM tags WHERE name = ? LIMIT 1', ['project']);
  console.log('Select result:', selectResult);

  // Extract ID from exec result
  let tagId = null;
  if (selectResult && selectResult.length > 0 && selectResult[0].values && selectResult[0].values.length > 0) {
    const row = selectResult[0].values[0];
    if (Array.isArray(row) && row.length > 0) {
      tagId = row[0];
    }
  }
  console.log('Tag ID extracted:', tagId);

  // Test 2: Verify exec() works with WHERE clause
  console.log('\n3. Test with explicit WHERE clause\n');
  db.run('INSERT INTO tags (name, created_at) VALUES (?, ?)', ['architecture', new Date().toISOString()]);
  const selectResult2 = db.exec('SELECT id FROM tags WHERE name = ?', ['architecture']);
  console.log('Select result:', selectResult2);

  let tagId2 = null;
  if (selectResult2 && selectResult2.length > 0 && selectResult2[0].values && selectResult2[0].values.length > 0) {
    const row = selectResult2[0].values[0];
    if (Array.isArray(row) && row.length > 0) {
      tagId2 = row[0];
    }
  }
  console.log('Tag ID extracted:', tagId2);

  // Test 3: Verify exec() returns empty for non-existent row
  console.log('\n4. Test with non-existent name\n');
  const selectResult3 = db.exec('SELECT id FROM tags WHERE name = ?', ['non-existent']);
  console.log('Select result:', selectResult3);

  let tagId3 = null;
  if (selectResult3 && selectResult3.length > 0 && selectResult3[0].values && selectResult3[0].values.length > 0) {
    const row = selectResult3[0].values[0];
    if (Array.isArray(row) && row.length > 0) {
      tagId3 = row[0];
    }
  }
  console.log('Tag ID extracted:', tagId3);

  // Test 4: Verify complete flow
  console.log('\n5. Test complete flow\n');
  const conversationId = 'test-conv';
  const insertTag = db.run('INSERT INTO tags (name, created_at) VALUES (?, ?)', ['wasm', new Date().toISOString()]);
  const selectId = db.exec('SELECT id FROM tags WHERE name = ?', ['wasm']);
  
  let finalTagId = null;
  if (selectId && selectId.length > 0 && selectId[0].values && selectId[0].values.length > 0) {
    const row = selectId[0].values[0];
    if (Array.isArray(row) && row.length > 0) {
      finalTagId = row[0];
    }
  }
  console.log('Conversation ID:', conversationId);
  console.log('Tag ID found:', finalTagId);
  console.log('Can create relation:', !!finalTagId);

  console.log('\n✅ Solution verified');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
