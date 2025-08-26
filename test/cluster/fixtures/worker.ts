// Minimal worker script for ClusterManager tests
// Exits on SIGTERM, otherwise stays alive indefinitely
process.on('SIGTERM', () => process.exit(0))

// Keep alive for a very long time (about 1 billion ms ~ 11.5 days)
const KEEP_ALIVE_INTERVAL = 1 << 30
setInterval(() => {}, KEEP_ALIVE_INTERVAL)
