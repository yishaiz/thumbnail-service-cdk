import boto3
import os
from urllib.parse import unquote_plus
from PIL import Image
from io import BytesIO

s3 = boto3.client('s3')

def s3_thumbnail_generator(event, context):
    # Get bucket and key from event
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = event['Records'][0]['s3']['object']['key']
    
    # ✅ IMPORTANT: Decode URL-encoded key
    key = unquote_plus(key)
    
    print(f"Processing: {bucket}/{key}")
    
    # Skip if already a thumbnail
    if key.startswith('thumbnails/'):
        print("Already a thumbnail, skipping")
        return
    
    # Skip non-image files
    if not key.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
        print("Not an image file, skipping")
        return
    
    try:
        # Download the image
        response = s3.get_object(Bucket=bucket, Key=key)
        image_content = response['Body'].read()
        
        # Create thumbnail
        img = Image.open(BytesIO(image_content))
        img.thumbnail((200, 200))
        
        # Save thumbnail to bytes
        buffer = BytesIO()
        img_format = img.format or 'JPEG'
        img.save(buffer, img_format)
        buffer.seek(0)
        
        # Generate thumbnail key
        filename = os.path.basename(key)
        thumbnail_key = f"thumbnails/{filename}"
        
        # Upload thumbnail (no ACL parameter!)
        s3.put_object(
            Bucket=bucket,
            Key=thumbnail_key,
            Body=buffer.getvalue(),
            ContentType=response['ContentType']
        )
        
        print(f"Thumbnail created: {thumbnail_key}")
        return {
            'statusCode': 200,
            'body': f'Thumbnail created: {thumbnail_key}'
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        raise e