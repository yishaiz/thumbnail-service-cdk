import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function, LayerVersion, Architecture } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { join } from 'path';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

export class ThumbnailServiceCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pillowLayer = new LayerVersion(this, 'PillowLayer', {
      code: cdk.aws_lambda.Code.fromAsset(
        join(__dirname, '../lambda-layer-pillow'),
        {
          bundling: {
            image: cdk.DockerImage.fromRegistry(
              'public.ecr.aws/lambda/python:3.12'
            ),
            command: [
              'bash',
              '-lc',
              // Install Pillow into the required layer directory structure at /asset-output/python
              'pip install --no-cache-dir Pillow -t /asset-output/python',
            ],
          },
        }
      ),
      compatibleRuntimes: [cdk.aws_lambda.Runtime.PYTHON_3_12],
      description: 'Layer with Pillow for image processing',
      compatibleArchitectures: [Architecture.X86_64],
    });

    const handler = new Function(this, 'handler-function-resizeImg', {
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_12,
      timeout: cdk.Duration.seconds(20),
      handler: 'app.s3_thumbnail_generator',
      code: cdk.aws_lambda.Code.fromAsset(join(__dirname, '../lambdas')),
      layers: [pillowLayer],
      architecture: Architecture.X86_64,
      environment: {
        REGION_NAME: 'us-east-1',
        THUMBNAIL_SIZE: '128',
      },
    });

    // LayerVersion.fromLayerVersionArn(
    //   this,
    //   'PIL',
    //   // 'arn:aws:lambda:us-east-1:770693421928:layer:Klayers-p39-Pillow:15'
    //   // 'arn:aws:lambda:us-east-1:770693421928:layer:Klayers-p39-pillow:1'
    //   // 'arn:aws:lambda:us-east-1:770693421928:layer:Klayers-p311-google-cloud-bigquery:22'
    //     //  'arn:aws:lambda:us-east-1:770693421928:layer:Klayers-p311-pillow:1'
    //     'arn:aws:lambda:us-east-1:770693421928:layer:Klayers-p312-pillow:1'

    //   //
    // ),
    // ],

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
