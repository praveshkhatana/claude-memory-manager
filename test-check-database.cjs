#!/usr/bin/env node

const initSqlJs = require('sql.js');
const fs = require('fs');

initSqlJs().then(SQL => {
  const DB_PATH = process.env.HOME + '/.claude/memory/memory.db';
  
  console.log('=== Checking Database Contents ===\n');

  // Load database
  const data = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(data);

  // Check conversations
  console.log('1. Conversations:');
  const convStmt = db.prepare('SELECT * FROM conversations LIMIT 2');
  const convs = convStmt.get();
  console.log('  Total:', convs ? convs.length : 0);
  if (Array.isArray(convs) && convs.length > 0) {
    const conv = convs[0];
    console.log('  ID:', conv['id']);
    console.log('  Project:', conv['project']);
    console.log('  Tags:', conv['tags']);
  }

  // Check tags
  console.log('\n2. Tags:');
  const tagStmt = db.prepare('SELECT * FROM tags');
  const tags = tagStmt.get();
  console.log('  Total:', tags ? tags.length : 0);
  if (Array.isArray(tags)) {
    tags.forEach((tag, i) => {
      console.log(`  ${i + 1}. ${tag['name']} (id: ${tag['id']})`);
    });
  }

  // Check tag_relations
  console.log('\n3. Tag Relations:');
  const relStmt = db.prepare('SELECT * FROM tag_relations');
  const rels = relStmt.get();
  console.log('  Total:', rels ? rels.length : 0);
  if (Array.isArray(rels)) {
    rels.forEach((rel, i) => {
      console.log(`  ${i + 1}. conversation_id="${rel['conversation_id']}", tag_id=${rel['tag_id']}`);
    });
  }

  // Check if INSERT OR IGNORE actually worked
  console.log('\n4. Testing INSERT OR IGNORE:');
  db.run('INSERT OR IGNORE INTO tags (name, created_at) VALUES (?, datetime("now"))', ['test-tag']);
  const testStmt = db.prepare('SELECT * FROM tags WHERE name = ?');
  const testResult = testStmt.get('test-tag');
  console.log('  After INSERT OR IGNORE, SELECT result:', testResult);
  console.log('  Is empty array?', testResult.length === 0);

  console.log('\n✅ Database check complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
