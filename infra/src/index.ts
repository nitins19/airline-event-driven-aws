#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import Environment from './Environment';

const PRIMARY_REGION = 'us-east-1';

const app = new App();

new Environment(app, 'Dev', {
  env: { account: '951373915799', region: PRIMARY_REGION }
});
