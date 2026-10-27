import * as path from 'path';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';

const REPO_ROOT = path.join(__dirname, '../..');

export class UploadStack extends Stack {
  public readonly bucket: s3.Bucket;
  public readonly uploadFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.bucket = new s3.Bucket(this, 'UploadBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.uploadFunction = new NodejsFunction(this, 'UploadFunction', {
      entry: path.join(REPO_ROOT, 'apps/backend/upload-lambda/src/handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_24_X,
      projectRoot: REPO_ROOT,
      depsLockFilePath: path.join(REPO_ROOT, 'yarn.lock'),
    });

    this.bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(this.uploadFunction),
      { suffix: '.csv' },
    );

    this.bucket.grantRead(this.uploadFunction);
  }
}
