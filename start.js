const setupAndSeed = require('./scripts/setup-and-seed');

// Run setup immediately
setupAndSeed().then(() => {
    console.log('\n✅ Setup complete! Starting server...\n');
    require('./server');
}).catch(err => {
    console.error('Setup failed:', err);
    process.exit(1);
});
