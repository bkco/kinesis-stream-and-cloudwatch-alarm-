#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AppStack } from '../lib/app-stack';

const app = new cdk.App();

new AppStack(app, 'AppStack', {

    // standard StackProps
    stackName: "kinesis-stream-and-cloudwatch-alarm-stack",
    env: {
        account: process.env.AWS_ACCOUNT || '788441421336',
        region: process.env.AWS_REGION || 'eu-west-1',
    }
}
);
