// Jest's testEnvironmentOptions does not populate process.env before modules load.
// Set it here so app/config bootstrap takes the test-only path and skips schedulers.
process.env.NODE_ENV = 'test';
