import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

// Export for use in other files
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

if (!OPENROUTER_API_KEY) {
  console.warn('Warning: OPENROUTER_API_KEY is not set in environment variables');
}