import io
import json
import zipfile

import requests


# 設定
ENDPOINT = "http://localhost:8000/api/v1"
API_KEY = "YOUR_SMARTREAD_API_KEY"  # 実際には設定から取得される
CONFIG_ID = 1  # 既存の設定ID
TOKEN = "YOUR_AUTH_TOKEN"  # ログイン後のトークン


def test_admin_upload():
    url = f"{ENDPOINT}/rpa/smartread/admin/upload-hybrid?config_id={CONFIG_ID}"
    headers = {"Authorization": f"Bearer {TOKEN}"}

    # 複数ファイルの準備
    files = [
        ("files", ("test1.pdf", b"%PDF-1.4 test content 1", "application/pdf")),
        ("files", ("test2.pdf", b"%PDF-1.4 test content 2", "application/pdf")),
    ]

    print(f"Sending request to {url}...")
    r = requests.post(url, headers=headers, files=files)

    if r.status_code != 200:
        print(f"Error: {r.status_code}")
        print(r.text)
        return

    print("Success! Downloaded ZIP size:", len(r.content))

    # ZIPの解析
    with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
        print("Files in ZIP:", zf.namelist())

        if "mapping.json" in zf.namelist():
            mapping = json.loads(zf.read("mapping.json"))
            print("Mapping content:", json.dumps(mapping, indent=2))


if __name__ == "__main__":
    # このスクリプトは開発環境での手動実行用
    # TOKENなどは実際の環境に合わせて取得する必要がある
    print("This script requires a valid AUTH_TOKEN and CONFIG_ID.")
    # test_admin_upload()
