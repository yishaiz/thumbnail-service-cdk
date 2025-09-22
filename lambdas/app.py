import boto3
from io import BytesIO
from PIL import Image, ImageOps

import os
import uuid
import json


s3 = boto3.client('s3')

size = int(os.environ.get('THUMBNAIL_SIZE'))
# size = int(os.environ.get('THUMBNAIL_SIZE', 128))

def s3_thumbnail_generator(event, context):
    print("Event:::", event)

    bucket_name = event['Records'][0]['s3']['bucket']['name']
    key = event['Records'][0]['s3']['object']['key']
    # img_size = event['Records'][0]['s3']['object']['size']

    if not key.endswith('_thumbnail.png'):
        # get the image from s3
        img = get_s3_image(bucket_name, key)

        # resize the image
        thumbnail = image_to_thumbnail(img)

        # get the new filename
        thumbnail_key = new_filename(key)

        # upload the file
        url = upload_to_s3(bucket_name, thumbnail_key, thumbnail)

        print("Image:::", url)

        return url

def get_s3_image(bucket, key):
    response = s3.get_object(Bucket=bucket, Key=key)
    image_content = response['Body'].read()

    file = BytesIO(image_content)
    img = Image.open(file)
    return img


def image_to_thumbnail(img):
    # Resize and crop to square
    return ImageOps.fit(img, (size, size), Image.ANTIALIAS)


# def new_filename(key):
#     key_split = key.split('.')
#     key_split[-1] = '_thumbnail.png'
#     return '.'.join(key_split)


def new_filename(key):
    key_split = key.rsplit('.', 1)
    return key_split[0] + '_thumbnail.png'


def upload_to_s3(bucket, key, image):
    out_thumbnail = BytesIO()
    image.save(out_thumbnail, 'PNG')
    out_thumbnail.seek(0)

    response = s3.put_object(
        ACL='public-read',
        Body=out_thumbnail,
        Bucket=bucket,
        ContentType='image/png',
        Key=key
    )

    print('response', response)

    url = '{}/{}/{}'.format(s3.meta.endpoint_url, bucket, key)
    print('response', url)

    # save image url to db
    # todo:

    return url