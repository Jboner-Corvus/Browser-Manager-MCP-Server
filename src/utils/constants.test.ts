import { expect, test } from 'vitest';
import * as constants from './constants.js';

test('constants are defined', () => {
  expect(constants.ANSI_COLORS).toBeDefined();
  expect(constants.ERROR_STACK_TRACE_MAX_LENGTH).toBeDefined();
  expect(constants.DEFAULT_PING_OPTIONS).toBeDefined();
  expect(constants.DEFAULT_HEALTH_CHECK_OPTIONS).toBeDefined();
});
