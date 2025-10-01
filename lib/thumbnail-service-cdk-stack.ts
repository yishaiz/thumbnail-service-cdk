import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { join } from 'path';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

export class ThumbnailServiceCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'thumbnail-tbl', {
      partitionKey: {
        name: 'id',
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const handler = new Function(this, 'handler-function-resizeImg', {
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_12,
      timeout: cdk.Duration.seconds(20),
      handler: 'app.s3_thumbnail_generator',
      code: cdk.aws_lambda.Code.fromAsset(join(__dirname, '../lambdas')),
      environment: {
        REGION_NAME: 'us-east-1',
        MY_Table: table.tableName,
      },
    });

    table.grantReadWriteData(handler);

    // דלי S3 פרטי עם Block Public Access מלא
    const s3Bucket = new s3.Bucket(this, 'photo-bucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // מעניק הרשאות קריאה וכתיבה ל-Lambda
    s3Bucket.grantReadWrite(handler);

    // מוסיף אירוע S3 להפעלת Lambda
    s3Bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(handler)
    );

    // מוסיף הרשאת CopyObject במפורש
    handler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject', 's3:PutObject', 's3:CopyObject'],
        resources: [s3Bucket.arnForObjects('*')],
      })
    );

    // יצוא שם הדלי כ-Output
    new cdk.CfnOutput(this, 'BucketName', {
      value: s3Bucket.bucketName,
      description: 'The name of the S3 bucket',
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
      description: 'The name of the DynamoDB table',
    });
  }
}