import firebase_admin
from firebase_admin import credentials, auth
from pathlib import Path
import os
import json

# Initialize Firebase Admin SDK with service account
# Try environment variable first, then fall back to file
def get_firebase_credentials():
    """Get Firebase credentials from environment variable or file"""
    # Check for environment variable (JSON string)
    firebase_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')
    if firebase_json:
        try:
            return credentials.Certificate(json.loads(firebase_json))
        except json.JSONDecodeError:
            pass
    
    # Fall back to file
    service_account_path = Path(__file__).parent / 'firebase-service-account.json'
    if service_account_path.exists():
        return credentials.Certificate(str(service_account_path))
    
    raise ValueError("Firebase service account credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON env variable or provide firebase-service-account.json file.")

try:
    # Check if already initialized
    firebase_admin.get_app()
except ValueError:
    # Initialize with service account credentials
    cred = get_firebase_credentials()
    firebase_admin.initialize_app(cred, {
        'projectId': os.getenv('FIREBASE_PROJECT_ID', 'networksolution-a9480'),
        'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET', 'networksolution-a9480.firebasestorage.app')
    })

def verify_firebase_token(token: str):
    """Verify Firebase ID token using Firebase Admin SDK"""
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except auth.ExpiredIdTokenError:
        raise Exception("Token has expired")
    except auth.RevokedIdTokenError:
        raise Exception("Token has been revoked")
    except auth.InvalidIdTokenError as e:
        raise Exception(f"Invalid token: {str(e)}")
    except Exception as e:
        raise Exception(f"Token verification failed: {str(e)}")
