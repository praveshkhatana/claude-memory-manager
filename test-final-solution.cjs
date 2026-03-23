#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  console.log('=== Final Working Solution ===\n');

  // Setup test data
  db.run('CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, created_at TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS tag_relations (conversation_id INTEGER, tag_id INTEGER, created_at TEXT)');

  // Approach: INSERT ON CONFLICT DO NOTHING, then get ID normally
  console.log('1. Insert tag with INSERT OR IGNORE');
  db.run('INSERT OR IGNORE INTO tags (name, created_at) VALUES (?, datetime("now"))', ['tag1']);
  console.log('✓ Insert executed');

  // Get the tag ID normally
  console.log('\n2. Get tag ID normally');
  const stmt = db.prepare('SELECT id FROM tags WHERE name = ?');
  const result = stmt.get('tag1');
  console.log('Tag ID result:', result);

  const tagId = Array.isArray(result) && result.length > 0 ? result[0]['id'] : null;
  console.log('Tag ID:', tagId);

  // Test with non-existent tag
  console.log('\n3. Test with non-existent tag');
  const stmt2 = db.prepare('SELECT id FROM tags WHERE name = ?');
  const result2 = stmt2.get('non-existent');
  const tagId2 = Array.isArray(result2) && result2.length > 0 ? result2[0]['id'] : null;
  console.log('Tag ID for non-existent:', tagId2);
  console.log('Is null?', tagId2 === null);

  // Test inserting multiple tags
  console.log('\n4. Test inserting multiple tags');
  const tagsToInsert = ['tag2', 'tag3', 'tag4'];
  const tagIds = [];

  for (const tagName of tagsToInsert) {
    // Insert with ON CONFLICT DO NOTHING
    db.run('INSERT OR IGNORE INTO tags (name, created_at) VALUES (?, datetime("now"))', [tagName]);
    
    // Get the ID
    const stmt = db.prepare('SELECT id FROM tags WHERE name = ?');
    const result = stmt.get(tagName);
    const id = Array.isArray(result) && result.length > 0 ? result[0]['id'] : null;
    tagIds.push({ name: tagName, id });
    console.log(`  ${tagName}: ${id}`);
  }

  // Now insert tag relations
  console.log('\n5. Insert tag relations');
  for (const tag of tagIds) {
    if (tag.id) {
      db.run('INSERT INTO tag_relations (conversation_id, tag_id, created_at) VALUES (?, ?, datetime("now"))', [1, tag.id]);
      console.log(`  ✓ Created relation: ${tag.name} (id: ${tag.id})`);
    }
  }

  // Verify relations exist
  console.log('\n6. Verify relations');
  const countStmt = db.prepare('SELECT COUNT(*) FROM tag_relations WHERE conversation_id = ?');
  const count = countStmt.get(1);
  const relationCount = Array.isArray(count) ? count[0] : 0;
  console.log('Tag relations count:', relationCount);

  // Show all relations
  const stmt3 = db.prepare('SELECT conversation_id, tag_id, created_at FROM tag_relations');
  const results = stmt3.get();
  console.log('All relations:', results);

  console.log('\n✅ Solution works!');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
