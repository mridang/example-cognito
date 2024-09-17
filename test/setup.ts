/* eslint-disable no-console */
import path from 'path';
import {
  DockerComposeEnvironment,
  StartedDockerComposeEnvironment,
} from 'testcontainers';
import { config } from 'dotenv';
import findFreePorts from 'find-free-ports';

declare global {
  // noinspection ES6ConvertVarToLetConst
  var DOCKER: StartedDockerComposeEnvironment; // eslint-disable-line no-var
}

config();
// this allows test containers to work in build pipeline
process.env.TESTCONTAINERS_RYUK_DISABLED = 'true';

// noinspection JSUnusedGlobalSymbols
export default async function setup(): Promise<void> {
  const port = (await findFreePorts(1))[0];

  console.info(`Starting Localstack compose on port ${port}`);
  const composeFilePath = path.resolve(__dirname, '..');
  try {
    globalThis.DOCKER = await new DockerComposeEnvironment(
      composeFilePath,
      'docker-compose.yml',
    )
      .withEnvironment({
        LOCALSTACK_PORT: port.toString(),
      })
      .up();

    process.env.AWS_ENDPOINT_URL = `http://localhost:${port}`;
    process.env.AWS_REGION = `us-east-1`;
    process.env.AWS_ACCESS_KEY_ID = 'test';
    process.env.AWS_SECRET_ACCESS_KEY = 'test';
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('already in use')) {
      console.info('Docker compose already running. Skipping bootstrap');
      return;
    }
    throw err;
  }
}
