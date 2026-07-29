import 'dotenv/config';
import { parseEnv, ConfigValidationError } from '../src/config/env.schema.js';

try {
  const env = parseEnv(process.env);
  console.log('Environment OK. Resolved NODE_ENV =', env.NODE_ENV);
  process.exit(0);
} catch (err) {
  if (err instanceof ConfigValidationError) {
    console.error('Environment validation FAILED:');
    for (const [field, messages] of Object.entries(err.fieldErrors)) {
      console.error(`  - ${field}: ${messages.join('; ')}`);
    }
    process.exit(1);
  }
  throw err;
}
