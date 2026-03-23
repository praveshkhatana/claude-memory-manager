#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  console.log('=== Testing INSERT into conversations ===\n');

  // Create table
  db.run('CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, project TEXT, timestamp TEXT, user_message TEXT, assistant_message TEXT, summary TEXT, embedding TEXT, tags TEXT)');
  console.log('✓ Table created');

  // Insert data
  console.log('Inserting conversation...');
  const id = 'test-id';
  const insert = db.run(
    'INSERT INTO conversations (id, project, timestamp, user_message, assistant_message, summary, embedding, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, 'test-project', new Date().toISOString(), 'user message', 'assistant message', 'summary', 'embedding', 'tags']
  );
  console.log('✓ Insert executed');

  // Check if data exists
  console.log('\nQuerying back...');
  const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?');
  const result = stmt.get(id);
  console.log('Result:', result);
  console.log('Is empty array?', Array.isArray(result) && result.length === 0);

  // Try with .exec()
  console.log('\nTrying with .exec()...');
  db.run('INSERT INTO conversations (id, project, timestamp, user_message, assistant_message, summary, embedding, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, 'test-project', new Date().toISOString(), 'user message', 'assistant message', 'summary', 'embedding', 'tags']);
  const result2 = db.exec('SELECT * FROM conversations WHERE id = ?', [id]);
  console.log('Result with .exec():', result2);

  console.log('\n✅ Test complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
