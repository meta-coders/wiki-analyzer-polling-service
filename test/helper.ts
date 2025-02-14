import Fastify from 'fastify';
import fp from 'fastify-plugin';
import App from '../src/app';
import tap from 'tap';
import { TestScheduler } from 'rxjs/testing';

export type Test = typeof tap['Test']['prototype'];

// Fill in this config with all the configurations
// needed for testing the application
async function config() {
  return {};
}

// Automatically build and tear down our instance
async function build(t: Test) {
  const app = Fastify();

  // fastify-plugin ensures that all decorators
  // are exposed for testing purposes, this is
  // different from the production setup
  void app.register(fp(App), await config());

  await app.ready();

  // Tear down our app after we are done
  t.tearDown(() => void app.close());

  return app;
}

async function getDeepEqualTestScheduler(t: Test): Promise<TestScheduler> {
  return new TestScheduler((actual, expected) => {
    t.deepEqual(actual, expected);
  });
}

export { config, build, getDeepEqualTestScheduler };
