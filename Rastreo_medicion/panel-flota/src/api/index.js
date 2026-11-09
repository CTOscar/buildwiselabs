import { config } from '../config.js';
import { createTraccarClient } from './traccar.js';
import { createMockClient } from './mock.js';

export function createClient() {
  return config.useMock ? createMockClient() : createTraccarClient();
}
