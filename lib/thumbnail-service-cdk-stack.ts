import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { join } from 'path';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

export class ThumbnailServiceCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const handler = new Function(this, 'handler-function-resizeImg', {
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
      timeout: cdk.Duration.seconds(20),
      handler: 'app.s3_thumbnail_generator',
      code: cdk.aws_lambda.Code.fromAsset(join(__dirname, '../lambdas')),
      environment: {
        REGION_NAME: 'us-east-1',
        THUMBNAIL_SIZE: '128',
      },
    });

    const s3Bucket = new s3.Bucket(this, 'photo-bucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    s3Bucket.grantReadWrite(handler);

    s3Bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(handler)
    );

    handler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        // actions: ['s3:*'],
        actions: ['s3:GetObject', 's3:PutObject'],
        resources: ['*'],
      })
    );
  }
}
