import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def test_admin_access():
    # 1. Register a new admin user (first user is admin)
    # We need to make sure the DB is clean or we use a unique username
    import time
    username = f"admin_{int(time.time())}"
    password = "password123"
    
    print(f"Registering user: {username}")
    resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "username": username,
        "password": password
    })
    print("Register response:", resp.status_code, resp.text)
    
    if resp.status_code not in [201, 409]:
        return

    # 2. Login to get token
    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": username,
        "password": password
    })
    print("Login response:", resp.status_code)
    
    if resp.status_code != 200:
        print("Login failed")
        return

    token = resp.json().get('access_token')
    print(f"Got token: {token[:20]}...")

    # 3. Access admin endpoint
    print("Accessing admin endpoint...")
    headers = {
        "Authorization": f"Bearer {token}"
    }
    resp = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
    print("Admin access response:", resp.status_code, resp.text)

    # 4. Test with malformed token
    print("Testing with malformed token...")
    headers = {
        "Authorization": "Bearer malformed.token.here"
    }
    resp = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
    print("Malformed token response:", resp.status_code, resp.text)

if __name__ == "__main__":
    print("Testing with 'undefined' token...")
    headers = {
        "Authorization": "Bearer undefined"
    }
    resp = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
    print("Undefined token response:", resp.status_code, resp.text)
