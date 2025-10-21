"""Unified object storage helper supporting S3, OSS, or local filesystem."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin
from uuid import uuid4


@dataclass
class UploadedFile:
    storage_key: str
    url: str


class StorageClient:
    """Simple abstraction over S3/OSS/local uploads."""

    def __init__(self) -> None:
        self.provider = os.getenv("STORAGE_PROVIDER", "local").lower()
        self.bucket = os.getenv("STORAGE_BUCKET")
        self.region = os.getenv("STORAGE_REGION")
        self.endpoint = os.getenv("STORAGE_ENDPOINT")
        self.local_root = Path(os.getenv("STORAGE_LOCAL_ROOT", "data/uploads")).expanduser()
        self.local_root.mkdir(parents=True, exist_ok=True)
        self._s3_client = None
        self._oss_bucket = None

    # ------------------------------------------------------------------
    def _ensure_s3(self):
        if self._s3_client is not None:
            return self._s3_client
        import boto3  # type: ignore

        session = boto3.session.Session(
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            aws_session_token=os.getenv("AWS_SESSION_TOKEN"),
            region_name=self.region or os.getenv("AWS_REGION"),
        )
        self._s3_client = session.client("s3", endpoint_url=self.endpoint)
        return self._s3_client

    def _ensure_oss(self):
        if self._oss_bucket is not None:
            return self._oss_bucket
        import oss2  # type: ignore

        auth = oss2.Auth(os.getenv("OSS_ACCESS_KEY_ID"), os.getenv("OSS_ACCESS_KEY_SECRET"))
        endpoint = self.endpoint or os.getenv("OSS_ENDPOINT")
        bucket_name = self.bucket or os.getenv("OSS_BUCKET")
        self._oss_bucket = oss2.Bucket(auth, endpoint, bucket_name)
        return self._oss_bucket

    # ------------------------------------------------------------------
    def upload(self, file_path: Path, *, prefix: Optional[str] = None) -> UploadedFile:
        object_key = self._build_object_key(file_path.name, prefix)
        if self.provider == "s3":
            client = self._ensure_s3()
            client.upload_file(str(file_path), self.bucket, object_key)
            url = self._build_public_url(object_key)
            return UploadedFile(storage_key=object_key, url=url)
        if self.provider == "oss":
            bucket = self._ensure_oss()
            with open(file_path, "rb") as handle:
                bucket.put_object(object_key, handle)
            url = self._build_public_url(object_key)
            return UploadedFile(storage_key=object_key, url=url)
        # default local storage
        target = self.local_root / object_key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(file_path.read_bytes())
        url = target.resolve().as_uri()
        return UploadedFile(storage_key=object_key, url=url)

    def delete(self, storage_key: str) -> None:
        if not storage_key:
            return
        if self.provider == "s3":
            client = self._ensure_s3()
            client.delete_object(Bucket=self.bucket, Key=storage_key)
        elif self.provider == "oss":
            bucket = self._ensure_oss()
            bucket.delete_object(storage_key)
        else:
            target = self.local_root / storage_key
            if target.exists():
                target.unlink()

    # ------------------------------------------------------------------
    def _build_public_url(self, object_key: str) -> str:
        if self.endpoint:
            return urljoin(self.endpoint.rstrip("/") + "/", object_key)
        if self.provider == "s3":
            region = self.region or os.getenv("AWS_REGION", "us-east-1")
            return f"https://{self.bucket}.s3.{region}.amazonaws.com/{object_key}"
        if self.provider == "oss":
            endpoint = os.getenv("OSS_PUBLIC_ENDPOINT") or os.getenv("OSS_ENDPOINT", "")
            if endpoint.startswith("http"):
                return urljoin(endpoint.rstrip("/") + "/", object_key)
            return f"https://{self.bucket}.{endpoint}/{object_key}"
        return (self.local_root / object_key).resolve().as_uri()

    @staticmethod
    def _build_object_key(file_name: str, prefix: Optional[str]) -> str:
        safe_prefix = prefix.strip("/") if prefix else datetime.utcnow().strftime("%Y/%m/%d")
        return f"{safe_prefix}/{uuid4().hex}_{file_name}"


# avoid circular imports
from datetime import datetime  # noqa: E402  pylint: disable=wrong-import-position
