// Minimal worker script for ClusterManager tests
// Exits on SIGTERM, otherwise stays alive indefinitely
process.on('SIGTERM', () => process.exit(0))

// Keep alive
setInterval(() => {}, 1 << 30)
