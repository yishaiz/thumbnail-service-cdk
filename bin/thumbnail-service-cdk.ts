#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ThumbnailServiceCdkStack } from '../lib/thumbnail-service-cdk-stack';

const app = new cdk.App();
const stack = new ThumbnailServiceCdkStack(app, 'ThumbnailServiceCdkStack', {});

stack.renameLogicalId(
  'ThumbnailServiceCdkStack',           // old id
  'ThumbnailServiceCdkStackUniqueName'  // new id
);
