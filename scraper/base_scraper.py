"""爬虫基类：通用请求、延迟、重试、保存"""

import json
import os
import random
import time
import logging
from pathlib import Path

import requests

from scraper.config import (
    REQUEST_DELAY_MIN, REQUEST_DELAY_MAX, MAX_RETRIES,
    RAW_DIR,
)

logger = logging.getLogger(__name__)


class BaseScraper:
    """所有爬虫的基类"""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json, text/html, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        })

    def fetch_json(self, url: str, params: dict = None, headers: dict = None) -> dict:
        """请求 JSON API"""
        for attempt in range(MAX_RETRIES):
            try:
                resp = self.session.get(url, params=params, headers=headers, timeout=15)
                resp.raise_for_status()
                data = resp.json()
                self._delay()
                return data
            except Exception as e:
                logger.warning(f"请求失败 (尝试 {attempt+1}/{MAX_RETRIES}): {url} — {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(random.uniform(3, 6))
                else:
                    raise

    def fetch_html(self, url: str, params: dict = None) -> str:
        """请求 HTML 页面"""
        for attempt in range(MAX_RETRIES):
            try:
                resp = self.session.get(url, params=params, timeout=15)
                resp.raise_for_status()
                resp.encoding = resp.apparent_encoding
                self._delay()
                return resp.text
            except Exception as e:
                logger.warning(f"请求失败 (尝试 {attempt+1}/{MAX_RETRIES}): {url} — {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(random.uniform(3, 6))
                else:
                    raise

    def post_json(self, url: str, json_data: dict = None, headers: dict = None) -> dict:
        """POST 请求 JSON API"""
        for attempt in range(MAX_RETRIES):
            try:
                resp = self.session.post(url, json=json_data, headers=headers, timeout=15)
                resp.raise_for_status()
                data = resp.json()
                self._delay()
                return data
            except Exception as e:
                logger.warning(f"POST失败 (尝试 {attempt+1}/{MAX_RETRIES}): {url} — {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(random.uniform(3, 6))
                else:
                    raise

    def _delay(self, min_s: float = None, max_s: float = None):
        """随机延迟，防止请求过快"""
        lo = min_s or REQUEST_DELAY_MIN
        hi = max_s or REQUEST_DELAY_MAX
        time.sleep(random.uniform(lo, hi))

    def save_raw(self, company_key: str, data: list[dict]):
        """保存原始数据到 JSON 文件"""
        os.makedirs(RAW_DIR, exist_ok=True)
        filepath = os.path.join(RAW_DIR, f"{company_key}.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"已保存 {len(data)} 条JD到 {filepath}")

    def load_raw(self, company_key: str) -> list[dict]:
        """加载已保存的原始数据"""
        filepath = os.path.join(RAW_DIR, f"{company_key}.json")
        if not os.path.exists(filepath):
            return []
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
