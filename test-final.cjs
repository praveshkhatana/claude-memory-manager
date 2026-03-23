#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  // Create tables
  db.run('CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, created_at TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS tag_relations (conversation_id TEXT, tag_id INTEGER, created_at TEXT, PRIMARY Key (conversation_id, tag_id))');

  console.log('=== Test Database State ===\n');

  // Test 1: Insert a tag
  console.log('1. Insert tag "test-tag"');
  const insert = db.prepare('INSERT INTO tags (name, created_at) VALUES (?, datetime("now"))');
  insert.run('test-tag');
  insert.free();
  console.log('✓ Inserted tag: test-tag');

  // Test 2: Get the tag
  console.log('\n2. Get tag "test-tag"');
  const stmt = db.prepare('SELECT id FROM tags WHERE name = ?');
  const result = stmt.get('test-tag');
  console.log('Result:', result);
  console.log('Result type:', typeof result);
  console.log('Result[0]:', result ? result[0] : 'undefined');

  // Test 3: Try to create relation
  console.log('\n3. Try to create relation');
  const tagId = result ? result[0] : null;
  console.log('tagId:', tagId);
  console.log('tagId == null:', tagId == null);

  if (tagId != null) {
    console.log('Inserting relation...');
    const insertRel = db.prepare('INSERT INTO tag_relations (conversation_id, tag_id, created_at) VALUES (?, ?, datetime("now"))');
    insertRel.run('test-conversation-id', tagId);
    insertRel.free();
    console.log('✓ Relation inserted');
  }

  // Test 4: Check database state
  console.log('\n4. Check database state');
  const countTags = db.prepare('SELECT COUNT(*) FROM tags');
  const countTagsResult = countTags.get();
  console.log('Total tags:', countTagsResult ? countTagsResult[0] : '0');

  const countRelations = db.prepare('SELECT COUNT(*) FROM tag_relations');
  const countRelationsResult = countRelations.get();
  console.log('Total relations:', countRelationsResult ? countRelationsResult[0] : '0');

  console.log('\n✅ Tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});