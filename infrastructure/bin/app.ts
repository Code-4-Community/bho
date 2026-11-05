import { App } from 'aws-cdk-lib';
import { UploadStack } from '../lib/upload-stack';

const app = new App();

new UploadStack(app, 'UploadStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
