import datetime
import boto3
import os
import json
import uuid
from datetime import datetime
# from botocore.exceptions import ClientError


s3 = boto3.client('s3')


def s3_thumbnail_generator(event, context):
    print("Event:::", event)

    bucket_name = event['Records'][0]['s3']['bucket']['name']
    key = event['Records'][0]['s3']['object']['key']
    region = os.environ.get('REGION_NAME', 'us-east-1')

    if key.endswith('_thumbnail') or key.endswith('_thumbnail.png'):
        print('Skipping thumbnail copy for already-processed object')
        return build_public_url(bucket_name, key, region)

    thumbnail_key = new_filename(key)

    s3.copy_object(
        Bucket=bucket_name,
        CopySource={'Bucket': bucket_name, 'Key': key},
        Key=thumbnail_key,
        MetadataDirective='COPY',
        # ACL='public-read',
    )

    url = build_public_url(bucket_name, thumbnail_key, region)
    print('Copied to', url)

    s3_save_thumbnail_url_to_dynamodb(url)

    return url


def s3_save_thumbnail_url_to_dynamodb(url):
    dynamodb = boto3.resource('dynamodb')
    # table_name = os.environ.get('MY_Table', 'thumbnail-tbl')
    table_name = os.environ.get('MY_Table')
    table = dynamodb.Table(table_name)

    item = {
        'id': str(uuid.uuid4()),
        'url': url,
        'createdAt': str(datetime.now()),
        'updatedAt': str(datetime.now()),
    }

    response = table.put_item(Item=item)

    print(f"Successfully inserted item into {table_name}: {item}")

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps(response)
    }

    # try:
    # except ClientError as e:
    #     print(f"Failed to insert item into {table_name}: {e.response['Error']['Message']}")


def new_filename(key):
    if '.' in key:
        base, ext = key.rsplit('.', 1)
        return f"{base}_thumbnail.{ext}"
    return key + '_thumbnail'


def build_public_url(bucket: str, key: str, region: str) -> str:
    if region == 'us-east-1':
        return f"https://{bucket}.s3.amazonaws.com/{key}"
    return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
