import boto3
import os


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
        ACL='public-read',
        MetadataDirective='COPY',
    )

    url = build_public_url(bucket_name, thumbnail_key, region)
    print('Copied to', url)
    return url


def new_filename(key):
    if '.' in key:
        base, ext = key.rsplit('.', 1)
        return f"{base}_thumbnail.{ext}"
    return key + '_thumbnail'


def build_public_url(bucket: str, key: str, region: str) -> str:
    if region == 'us-east-1':
        return f"https://{bucket}.s3.amazonaws.com/{key}"
    return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
