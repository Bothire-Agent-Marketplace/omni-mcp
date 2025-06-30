import { config } from "dotenv";

// Load environment variables from .env file
config();

export const LINEAR_CONFIG = {
  API_KEY: process.env.LINEAR_API_KEY,
};

if (!LINEAR_CONFIG.API_KEY) {
  console.error("Error: LINEAR_API_KEY environment variable is required.");
  process.exit(1);
}
