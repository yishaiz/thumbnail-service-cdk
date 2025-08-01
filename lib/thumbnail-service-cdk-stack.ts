import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { join } from 'path';
import * as s3 from 'aws-cdk-lib/aws_s3';

export class ThumbnailServiceCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const handler = new Function(this, 'handler-function-resizeImg', {
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
      timeout: cdk.Duration.seconds(20),
      handler: 'app.s3_thumbnail_generator',
      code: cdk.aws_lambda.Code.fromAsset(join(__dirname, '../lambda')),
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
  }
}
