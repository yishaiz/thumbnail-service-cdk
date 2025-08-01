#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ThumbnailServiceCdkStack } from '../lib/thumbnail-service-cdk-stack';

const app = new cdk.App();
new ThumbnailServiceCdkStack(app, 'ThumbnailServiceCdkStack', {
  
});