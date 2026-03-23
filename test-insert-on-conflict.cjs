#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  console.log('=== Testing INSERT with ON CONFLICT ===\n');

  // Setup test data
  db.run('CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, created_at TEXT)');

  // Test 1: Insert new tag
  console.log('1. Insert new tag');
  db.run('INSERT INTO tags (name, created_at) VALUES (?, datetime("now"))', ['tag1']);
  console.log('✓ Insert succeeded');

  // Test 2: Try to insert duplicate
  console.log('\n2. Try to insert duplicate tag');
  db.run('INSERT INTO tags (name, created_at) VALUES (?, datetime("now"))', ['tag1']);
  console.log('✓ Insert executed (may have failed silently)');

  // Check what happened
  console.log('\n3. Check database state');
  const stmt = db.prepare('SELECT id, name, created_at FROM tags');
  const result = stmt.get();
  console.log('All tags:', result);

  const tags = Array.isArray(result) ? result : [];
  console.log('Number of tags:', tags.length);

  // Test 3: Use INSERT OR REPLACE
  console.log('\n4. Test INSERT OR REPLACE');
  db.run('INSERT OR REPLACE INTO tags (id, name, created_at) VALUES (1, "tag1-duplicate", datetime("now"))', [1]);
  console.log('✓ INSERT OR REPLACE executed');

  // Check if duplicate was replaced
  const stmt2 = db.prepare('SELECT id, name FROM tags WHERE name = "tag1-duplicate"');
  const result2 = stmt2.get();
  console.log('Duplicate tag:', result2);

  // Test 4: Use INSERT with ON CONFLICT
  console.log('\n5. Test INSERT with ON CONFLICT DO NOTHING');
  db.run('INSERT INTO tags (id, name, created_at) VALUES (2, "tag2-duplicate", datetime("now")) ON CONFLICT(name) DO NOTHING', [2]);
  console.log('✓ INSERT ON CONFLICT executed');

  // Check if it was created
  const stmt3 = db.prepare('SELECT id, name FROM tags WHERE name = "tag2-duplicate"');
  const result3 = stmt3.get();
  console.log('tag2-duplicate:', result3);

  // Test 5: Try to insert again (should do nothing)
  console.log('\n6. Try to insert tag2-duplicate again');
  db.run('INSERT INTO tags (id, name, created_at) VALUES (3, "tag2-duplicate", datetime("now")) ON CONFLICT(name) DO NOTHING', [3]);
  console.log('✓ Second insert executed');

  // Final count
  const stmt4 = db.prepare('SELECT COUNT(*) FROM tags');
  const count = stmt4.get();
  const totalCount = Array.isArray(count) ? count[0] : 0;
  console.log('\nFinal total tags:', totalCount);

  console.log('\n✅ Tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
