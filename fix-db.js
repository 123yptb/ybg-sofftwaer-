const Database = require('better-sqlite3');
const path = require('path');

const dbPath1 = path.join(__dirname, 'frontend', 'prisma', 'prisma', 'dev.db');
const dbPath2 = path.join(__dirname, 'prisma', 'dev.db');

try {
  const db1 = new Database(dbPath1);
  db1.exec('DELETE FROM ProductionMaterial');
  db1.exec('DELETE FROM ProductionOrder');
  db1.close();
  console.log('Cleared Production tables in frontend nested db!');
} catch (e) {
  console.log('Error frontend db:', e.message);
}

try {
  const db2 = new Database(dbPath2);
  db2.exec('DELETE FROM ProductionMaterial');
  db2.exec('DELETE FROM ProductionOrder');
  db2.close();
  console.log('Cleared Production tables in root db!');
} catch (e) {
  console.log('Error root db:', e.message);
}
