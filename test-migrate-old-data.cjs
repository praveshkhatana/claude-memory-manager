#!/usr/bin/env node

const initSqlJs = require('sql.js');
const fs = require('fs');

initSqlJs().then(SQL => {
  console.log('=== Migrating from Old Database ===\n');

  // Load old database
  const oldData = fs.readFileSync('/tmp/old-memory.db.backup');
  const oldDb = new SQL.Database(oldData);

  // Check old database structure
  console.log('1. Old Database Structure:');
  try {
    const stmt = oldDb.prepare('SELECT name FROM sqlite_master WHERE type="table"');
    const tables = stmt.get();
    console.log('  Tables:', tables);
    
    if (Array.isArray(tables)) {
      tables.forEach(table => {
        console.log(`    - ${table['name']}`);
      });
    }
  } catch (err) {
    console.log('  Error:', err.message);
  }

  // Check conversations
  console.log('\n2. Old Conversations:');
  try {
    const stmt = oldDb.prepare('SELECT COUNT(*) FROM conversations');
    const count = stmt.get();
    const totalCount = Array.isArray(count) ? count[0] : 0;
    console.log('  Total:', totalCount);

    if (totalCount > 0) {
      const sample = oldDb.prepare('SELECT * FROM conversations LIMIT 1');
      const sampleData = sample.get();
      console.log('  Sample:', sampleData);
    }
  } catch (err) {
    console.log('  Error:', err.message);
  }

  // Check tags
  console.log('\n3. Old Tags:');
  try {
    const stmt = oldDb.prepare('SELECT COUNT(*) FROM tags');
    const count = stmt.get();
    const totalCount = Array.isArray(count) ? count[0] : 0;
    console.log('  Total:', totalCount);

    if (totalCount > 0) {
      const stmt2 = oldDb.prepare('SELECT * FROM tags LIMIT 5');
      const tags = stmt2.get();
      if (Array.isArray(tags)) {
        tags.forEach((tag, i) => {
          console.log(`    ${i + 1}. ${tag['name']} (id: ${tag['id']})`);
        });
      }
    }
  } catch (err) {
    console.log('  Error:', err.message);
  }

  // Check tag_relations
  console.log('\n4. Old Tag Relations:');
  try {
    const stmt = oldDb.prepare('SELECT COUNT(*) FROM tag_relations');
    const count = stmt.get();
    const totalCount = Array.isArray(count) ? count[0] : 0;
    console.log('  Total:', totalCount);

    if (totalCount > 0) {
      const stmt2 = oldDb.prepare('SELECT * FROM tag_relations LIMIT 5');
      const rels = stmt2.get();
      if (Array.isArray(rels)) {
        rels.forEach((rel, i) => {
          console.log(`    ${i + 1}. conversation_id="${rel['conversation_id']}", tag_id=${rel['tag_id']}`);
        });
      }
    }
  } catch (err) {
    console.log('  Error:', err.message);
  }

  console.log('\n✅ Old data inspection complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
