#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  console.log('=== Testing Alternative Approaches for sql.js ===\n');

  // Setup test data
  console.log('1. Setup test data');
  db.run('CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, created_at TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS tag_relations (conversation_id INTEGER, tag_id INTEGER, created_at TEXT)');

  const insert = db.prepare('INSERT INTO tags (name, created_at) VALUES (?, datetime("now"))');
  insert.run('tag1');
  insert.run('tag2');
  insert.free();
  console.log('✓ Inserted 2 tags');

  // Test 1: COUNT query
  console.log('\n2. Test COUNT query');
  const countStmt = db.prepare('SELECT COUNT(*) FROM tags WHERE name = ?');
  const count = countStmt.get('tag1');
  console.log('COUNT result:', count);
  console.log('COUNT type:', typeof count);

  // Extract count from array
  const countValue = Array.isArray(count) ? count[0] : 0;
  console.log('Count value:', countValue);
  console.log('Count > 0:', countValue > 0);

  // Test 2: Select with limit 1
  console.log('\n3. Test SELECT with LIMIT 1');
  const limitStmt = db.prepare('SELECT * FROM tags WHERE name = ? LIMIT 1');
  const limitResult = limitStmt.get('tag1');
  console.log('LIMIT 1 result:', limitResult);
  console.log('LIMIT 1 type:', typeof limitResult);
  console.log('LIMIT 1 === []:', limitResult === []);

  // Test 3: .exec() for INSERT (check return value)
  console.log('\n4. Test INSERT via .exec()');
  const execResult = db.exec('INSERT INTO tags (name, created_at) VALUES (?, datetime("now"))', ['tag3']);
  console.log('exec result:', execResult);
  console.log('exec result type:', typeof execResult);

  // Test 4: Check if INSERT succeeded by querying again
  console.log('\n5. Check if INSERT succeeded');
  const afterStmt = db.prepare('SELECT COUNT(*) FROM tags');
  const afterCount = afterStmt.get();
  console.log('Total tags after INSERT:', afterCount);
  const totalTags = Array.isArray(afterCount) ? afterCount[0] : 0;
  console.log('Total tags:', totalTags);

  // Test 5: Try INSERT OR REPLACE
  console.log('\n6. Test INSERT OR REPLACE');
  db.run('INSERT INTO tags (id, name, created_at) VALUES (1, "tag1-duplicate", datetime("now"))', [1]);
  const duplicateStmt = db.prepare('SELECT COUNT(*) FROM tags WHERE name = ?');
  const duplicateCount = duplicateStmt.get('tag1-duplicate');
  console.log('After INSERT OR REPLACE:', duplicateCount);

  // Test 6: Use INSERT with ON CONFLICT
  console.log('\n7. Test INSERT ON CONFLICT');
  db.run('INSERT INTO tags (id, name, created_at) VALUES (2, "tag2-duplicate", datetime("now")) ON CONFLICT(name) DO NOTHING');
  const conflictCount = db.prepare('SELECT COUNT(*) FROM tags WHERE name = "tag2-duplicate"').get();
  console.log('After INSERT ON CONFLICT:', conflictCount);

  console.log('\n✅ Tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
