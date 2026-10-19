import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { UploadStack } from '../lib/upload-stack';

describe('UploadStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new App({ context: { 'aws:cdk:bundling-stacks': [] } });
    template = Template.fromStack(new UploadStack(app, 'TestUploadStack'));
  });

  describe('bucket', () => {
    it('encrypts objects at rest', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' },
            },
          ],
        },
      });
    });

    it('blocks all public access', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    it('denies requests that do not use SSL', () => {
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Deny',
              Action: 's3:*',
              Condition: { Bool: { 'aws:SecureTransport': 'false' } },
            }),
          ]),
        },
      });
    });

    it('is retained when the stack is deleted or replaced', () => {
      template.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });
  });

  describe('upload lambda', () => {
    it('is created with the handler entry point', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Handler: 'index.handler',
        Runtime: 'nodejs24.x',
      });
    });
  });

  describe('notification', () => {
    it('invokes the lambda for .csv objects created in the bucket', () => {
      template.hasResourceProperties('Custom::S3BucketNotifications', {
        NotificationConfiguration: {
          LambdaFunctionConfigurations: [
            {
              Events: ['s3:ObjectCreated:*'],
              Filter: {
                Key: {
                  FilterRules: [{ Name: 'suffix', Value: '.csv' }],
                },
              },
              LambdaFunctionArn: Match.anyValue(),
            },
          ],
        },
      });
    });

    it('lets S3 invoke the lambda', () => {
      template.hasResourceProperties('AWS::Lambda::Permission', {
        Action: 'lambda:InvokeFunction',
        Principal: 's3.amazonaws.com',
      });
    });
  });

  describe('lambda permissions', () => {
    it('can read objects from the bucket', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: ['s3:GetObject*', 's3:GetBucket*', 's3:List*'],
            }),
          ]),
        },
      });
    });

    it('cannot write or delete objects', () => {
      const lambdaPolicies = Object.values(
        template.findResources('AWS::IAM::Policy'),
      ).filter((p) =>
        JSON.stringify(p.Properties.Roles).includes(
          'UploadFunctionServiceRole',
        ),
      );
      const actions = lambdaPolicies
        .flatMap((p) => p.Properties.PolicyDocument.Statement)
        .flatMap((s: { Action: string | string[] }) => s.Action);

      expect(actions).toHaveLength(3);
      expect(actions.join()).not.toMatch(/Put|Delete|s3:\*/);
    });
  });
});
