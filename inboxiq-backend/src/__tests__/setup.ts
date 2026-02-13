// Dummy env vars so module-level validation in server.ts doesn't throw during test imports
process.env.JWT_SECRET = "test-secret-key-that-is-at-least-32-characters-long";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "test-supabase-service-key";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
process.env.TOKEN_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
