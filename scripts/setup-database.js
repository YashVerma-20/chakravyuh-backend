const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function setupDatabase() {
    try {
        console.log('📦 Setting up database...');

        const schemaPath = path.join(__dirname, '..', 'schema-sqlite.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');

        // Execute schema using SQLite's exec method
        db.db.exec(schema);

        console.log('✅ Database schema created successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    }
}

setupDatabase();
