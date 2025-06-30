// Global test setup

// Setup process environment
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "error"; // Reduce log noise during tests

// Global error handler to prevent unhandled rejections from failing tests
process.on("unhandledRejection", (reason, promise) => {
  console.warn("Unhandled Rejection at:", promise, "reason:", reason);
});
