#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  console.log('=== Testing COUNT-based Solution ===\n');

  // Setup test data
  db.run('CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, created_at TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS tag_relations (conversation_id INTEGER, tag_id INTEGER, created_at TEXT)');

  // Approach 1: Use COUNT(*) to check existence
  console.log('1. Check if tag exists using COUNT(*)');
  const countStmt = db.prepare('SELECT COUNT(*) FROM tags WHERE name = ?');
  const count = countStmt.get('new-tag');
  console.log('Count for non-existent tag:', count);
  
  const countValue = Array.isArray(count) ? count[0] : 0;
  console.log('Count value:', countValue);
  console.log('Does NOT exist (count === 0):', countValue === 0);

  // Insert the tag
  console.log('\n2. Insert new tag');
  db.run('INSERT INTO tags (name, created_at) VALUES (?, datetime("now"))', ['existing-tag']);
  console.log('✓ Inserted tag');

  // Check again
  console.log('\n3. Check if tag exists after insert');
  const countAfter = countStmt.get('existing-tag');
  const countAfterValue = Array.isArray(countAfter) ? countAfter[0] : 0;
  console.log('Count after insert:', countAfterValue);
  console.log('Does exist (count > 0):', countAfterValue > 0);

  // Get the tag ID using COUNT to find max ID
  console.log('\n4. Get tag ID by finding max ID');
  const maxIdStmt = db.prepare('SELECT MAX(id) FROM tags');
  const maxId = maxIdStmt.get();
  const maxIdValue = Array.isArray(maxId) ? maxId[0] : 0;
  console.log('Max ID:', maxIdValue);

  // Alternative: Use WHERE with LIMIT 1 and check result
  console.log('\n5. Alternative: WHERE with LIMIT 1');
  const whereLimitStmt = db.prepare('SELECT id FROM tags WHERE name = ? LIMIT 1');
  const whereLimit = whereLimitStmt.get('existing-tag');
  console.log('WHERE LIMIT result:', whereLimit);
  const whereId = Array.isArray(whereLimit) && whereLimit.length > 0 ? whereLimit[0]['id'] : null;
  console.log('Tag ID:', whereId);

  // Test with tag_relations
  console.log('\n6. Test INSERT into tag_relations');
  db.run('INSERT INTO tag_relations (conversation_id, tag_id, created_at) VALUES (?, ?, datetime("now"))', [1, whereIdValue || maxIdValue]);
  console.log('✓ Created tag relation');

  // Check relation exists
  const relationCount = db.prepare('SELECT COUNT(*) FROM tag_relations WHERE conversation_id = ?').get(1);
  console.log('Relations count:', relationCount);
  const relationCountValue = Array.isArray(relationCount) ? relationCount[0] : 0;
  console.log('Relations exist:', relationCountValue > 0);

  console.log('\n✅ Tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
