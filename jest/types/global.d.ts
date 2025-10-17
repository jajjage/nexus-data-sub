import { config } from '../../src/config/env';

declare global {
  namespace NodeJS {
    interface Global {
      testConfig: typeof config;
    }
  }

  var testConfig: typeof config;
}
