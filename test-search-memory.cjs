#!/usr/bin/env node

const initSqlJs = require('sql.js');
const fs = require('fs');

initSqlJs().then(SQL => {
  console.log('=== Testing searchMemory() Function ===\n');

  // Load existing database
  const DB_PATH = process.env.HOME + '/.claude/memory/memory.db';
  const data = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(data);

  // Test 1: Search by project
  console.log('1. Search by project: "Flow-Draw"\n');
  const results1 = db.exec("SELECT * from conversations WHERE project = ?", ['Flow-Draw']);
  console.log('Results:', results1.length, 'conversation(s)');

  // Test 2: Search by tag
  console.log('\n2. Search by tag: "project"\n');
  const results2 = db.exec("SELECT c.* FROM conversations c JOIN tag_relations tr ON c.id = tr.conversation_id JOIN tags t ON tr.tag_id = t.id WHERE t.name = ?", ['project']);
  console.log('Results:', results2.length, 'conversation(s)');

  // Test 3: Search by summary
  console.log('\n3. Search by summary containing: "Architecture"\n');
  const results3 = db.exec("SELECT * from conversations WHERE summary LIKE ?", ['%Architecture%']);
  console.log('Results:', results3.length, 'conversation(s)');

  // Test 4: Get all tags
  console.log('\n4. Get all tags\n');
  const tags = db.exec("SELECT * from tags");
  console.log('Total tags:', tags.length);

  // Test 5: Get all tag relations
  console.log('\n5. Get all tag relations\n');
  const relations = db.exec("SELECT * from tag_relations");
  console.log('Total relations:', relations.length);

  console.log('\n✅ Search tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
