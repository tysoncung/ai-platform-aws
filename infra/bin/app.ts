#!/usr/bin/env node
import 'source-map-support/register.js';
import * as cdk from 'aws-cdk-lib';
import { GatewayStack } from '../lib/gateway-stack.js';
import { MonitoringStack } from '../lib/monitoring-stack.js';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-southeast-2',
};

const gateway = new GatewayStack(app, 'AIGatewayStack', { env });

new MonitoringStack(app, 'AIGatewayMonitoringStack', {
  env,
  service: gateway.service,
  alarmEmail: app.node.tryGetContext('alarmEmail'),
});
