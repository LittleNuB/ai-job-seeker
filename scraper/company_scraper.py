"""大厂官方招聘页爬虫（P0 数据源）

字节跳动、阿里巴巴：Playwright 浏览器自动化 + API 拦截
腾讯、美团、NVIDIA：直接 HTTP API 调用（更快更稳）
百度：需要登录，暂不可用
"""

import json
import logging
import os
import random
import time

import requests
from playwright.sync_api import sync_playwright

from scraper.config import (
    COMPANY_CONFIGS, KEYWORD_DELAY_MIN, KEYWORD_DELAY_MAX,
    MAX_PAGES_PER_KEYWORD, RAW_DIR,
)

logger = logging.getLogger(__name__)

# 不需要浏览器的公司（直接 API 调用）
API_ONLY_COMPANIES = {"tencent", "meituan", "baidu", "nvidia"}
# 需要登录/反爬的公司（暂时跳过）
BLOCKED_COMPANIES = {"baidu", "huawei"}


class CompanyScraper:
    """大厂招聘页爬虫"""

    def scrape_all(self, companies: list[str] = None) -> dict[str, list[dict]]:
        """爬取所有配置公司的 AI 岗位"""
        targets = companies or list(COMPANY_CONFIGS.keys())
        results = {}

        # 分离需要浏览器和不需要浏览器的公司
        browser_targets = [k for k in targets if k not in API_ONLY_COMPANIES and k not in BLOCKED_COMPANIES]
        api_targets = [k for k in targets if k in API_ONLY_COMPANIES and k not in BLOCKED_COMPANIES]

        # 先处理 API 直调的公司
        for key in api_targets:
            config = COMPANY_CONFIGS.get(key)
            if not config:
                continue
            logger.info(f"开始爬取 {config['name']}...")
            try:
                jds = self._scrape_company(None, None, key, config)
                self._save_raw(key, jds)
                results[key] = jds
                logger.info(f"{config['name']} 完成，获取 {len(jds)} 条JD")
            except Exception as e:
                logger.error(f"{config['name']} 爬取失败: {e}")
                results[key] = []

        # 再处理需要浏览器的公司
        if browser_targets:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                for key in browser_targets:
                    config = COMPANY_CONFIGS.get(key)
                    if not config:
                        continue
                    logger.info(f"开始爬取 {config['name']}...")
                    try:
                        jds = self._scrape_company(p, browser, key, config)
                        self._save_raw(key, jds)
                        results[key] = jds
                        logger.info(f"{config['name']} 完成，获取 {len(jds)} 条JD")
                    except Exception as e:
                        logger.error(f"{config['name']} 爬取失败: {e}")
                        results[key] = []
                browser.close()

        # 标记被跳过的公司
        for key in targets:
            if key in BLOCKED_COMPANIES:
                config = COMPANY_CONFIGS.get(key)
                name = config['name'] if config else key
                reason = "需要登录" if key == "baidu" else "暂未适配"
                logger.warning(f"跳过 {name}（{reason}）")
                results[key] = []

        return results

    def _scrape_company(self, playwright, browser, key: str, config: dict) -> list[dict]:
        """根据公司配置分发到对应爬虫方法"""
        scraper_map = {
            "bytedance": self._scrape_bytedance,
            "meituan": self._scrape_meituan,
            "tencent": self._scrape_tencent,
            "alibaba": self._scrape_alibaba,
            "nvidia": self._scrape_nvidia,
        }
        method = scraper_map.get(key)
        if method:
            return method(browser, config)

        logger.warning(f"  {config['name']} 无专门适配，跳过")
        return []

    # ──── 字节跳动（Playwright API 拦截）────

    def _scrape_bytedance(self, browser, config: dict) -> list[dict]:
        """字节跳动招聘页 — 通过搜索页拦截 API 响应"""
        all_jds = []

        for keyword in config["search_keywords"]:
            logger.info(f"  搜索关键词: {keyword}")
            try:
                jds = self._bytedance_search(browser, keyword)
                all_jds.extend(jds)
                logger.info(f"    获取 {len(jds)} 条")
            except Exception as e:
                logger.warning(f"  关键词 '{keyword}' 搜索失败: {e}")
            time.sleep(random.uniform(KEYWORD_DELAY_MIN, KEYWORD_DELAY_MAX))

        return self._deduplicate(all_jds)

    def _bytedance_search(self, browser, keyword: str) -> list[dict]:
        all_jobs = []

        for page_idx in range(MAX_PAGES_PER_KEYWORD):
            offset = page_idx * 10
            context = browser.new_context()
            page = context.new_page()

            api_responses = []

            def handle_response(response):
                if 'search/job/posts' in response.url:
                    try:
                        body = response.json()
                        api_responses.append(body)
                    except Exception:
                        pass

            page.on('response', handle_response)

            search_url = (
                f"https://jobs.bytedance.com/experienced/position"
                f"?keywords={keyword}&current={page_idx + 1}&limit=10"
                f"&offset={offset}&category=&location=&project=&type="
            )

            try:
                page.goto(search_url, wait_until='networkidle', timeout=20000)
                page.wait_for_timeout(3000)
            except Exception as e:
                logger.debug(f"  页面加载超时: {e}")

            page_jobs = []
            for resp_data in api_responses:
                job_list = resp_data.get('data', {}).get('job_post_list', [])
                for job in job_list:
                    jd = self._bytedance_parse_job(job)
                    if jd:
                        page_jobs.append(jd)

            page.close()
            context.close()

            if not page_jobs:
                break

            all_jobs.extend(page_jobs)
            logger.debug(f"    第{page_idx+1}页: {len(page_jobs)} 条")

        return all_jobs

    def _bytedance_parse_job(self, job: dict) -> dict | None:
        try:
            title = job.get("title", "")
            if not self._is_ai_related(title):
                return None

            description = job.get("description", "")
            requirement = job.get("requirement", "")
            jd_text = f"{description}\n{requirement}".strip()

            if len(jd_text) < 50:
                return None

            city_info = job.get("city_info", {})
            city = city_info.get("name", "") if city_info else ""
            city_list = job.get("city_list", [])
            if not city and city_list:
                city = "/".join(c.get("name", "") for c in city_list)

            return {
                "title": title,
                "company": "字节跳动",
                "salary": "",
                "city": city,
                "experience": "",
                "education": "",
                "jd_text": jd_text,
                "url": f"https://jobs.bytedance.com/experienced/position/{job.get('id', '')}",
                "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            }
        except Exception as e:
            logger.debug(f"解析字节岗位失败: {e}")
            return None

    # ──── 美团（直接 POST API）────

    def _scrape_meituan(self, browser, config: dict) -> list[dict]:
        """美团招聘页 — 直接 POST 调用 getJobList API"""
        all_jds = []
        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Content-Type": "application/json",
            "Referer": "https://zhaopin.meituan.com/web/social",
            "Origin": "https://zhaopin.meituan.com",
        })

        for keyword in config["search_keywords"]:
            logger.info(f"  搜索关键词: {keyword}")
            try:
                jds = self._meituan_search(session, keyword)
                all_jds.extend(jds)
                logger.info(f"    获取 {len(jds)} 条")
            except Exception as e:
                logger.warning(f"  关键词 '{keyword}' 搜索失败: {e}")
            time.sleep(random.uniform(KEYWORD_DELAY_MIN, KEYWORD_DELAY_MAX))

        return self._deduplicate(all_jds)

    def _meituan_search(self, session, keyword: str) -> list[dict]:
        all_jobs = []

        for page_idx in range(MAX_PAGES_PER_KEYWORD):
            payload = {
                "page": {"pageNo": page_idx + 1, "pageSize": 10},
                "jobShareType": "1",
                "keywords": keyword,
                "cityList": [],
                "department": [],
                "jfJgList": [],
                "jobType": [{"code": "3", "subCode": []}],
                "typeCode": [],
                "specialCode": [],
            }

            try:
                resp = session.post(
                    "https://zhaopin.meituan.com/api/official/job/getJobList",
                    json=payload, timeout=15,
                )
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                logger.debug(f"  API 请求失败: {e}")
                break

            job_list = data.get("data", {}).get("list", [])
            page_jobs = []
            for job in job_list:
                jd = self._meituan_parse_job(job)
                if jd:
                    page_jobs.append(jd)

            if not page_jobs:
                break

            all_jobs.extend(page_jobs)
            logger.debug(f"    第{page_idx+1}页: {len(page_jobs)} 条")
            time.sleep(random.uniform(2, 5))

        return all_jobs

    def _meituan_parse_job(self, job: dict) -> dict | None:
        try:
            title = job.get("name", "")
            if not self._is_ai_related(title):
                return None

            duty = job.get("jobDuty", "")
            requirement = job.get("jobRequirement", "") or ""
            highlight = job.get("highLight", "") or ""
            jd_text = f"{duty}\n{requirement}\n{highlight}".strip()

            if len(jd_text) < 50:
                return None

            city_list = job.get("cityList", [])
            city = "/".join(c.get("name", "") for c in city_list) if city_list else ""

            dept_list = job.get("department", [])
            dept = dept_list[0].get("name", "") if dept_list else ""

            return {
                "title": title,
                "company": "美团",
                "salary": "",
                "city": city,
                "experience": job.get("workYear", "") or "",
                "education": "",
                "jd_text": jd_text,
                "url": f"https://zhaopin.meituan.com/web/jobDetail/{job.get('jobUnionId', '')}",
                "department": dept,
                "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            }
        except Exception as e:
            logger.debug(f"解析美团岗位失败: {e}")
            return None

    # ──── 腾讯（直接 GET API）────

    def _scrape_tencent(self, browser, config: dict) -> list[dict]:
        """腾讯招聘页 — 直接调用 post/Query API"""
        all_jds = []
        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://careers.tencent.com/search.html",
        })

        for keyword in config["search_keywords"]:
            logger.info(f"  搜索关键词: {keyword}")
            try:
                jds = self._tencent_search(session, keyword)
                all_jds.extend(jds)
                logger.info(f"    获取 {len(jds)} 条")
            except Exception as e:
                logger.warning(f"  关键词 '{keyword}' 搜索失败: {e}")
            time.sleep(random.uniform(KEYWORD_DELAY_MIN, KEYWORD_DELAY_MAX))

        return self._deduplicate(all_jds)

    def _tencent_search(self, session, keyword: str) -> list[dict]:
        all_jobs = []

        for page_idx in range(MAX_PAGES_PER_KEYWORD):
            params = {
                "timestamp": str(int(time.time() * 1000)),
                "countryId": "",
                "cityId": "",
                "bgIds": "",
                "productId": "",
                "categoryId": "",
                "parentCategoryId": "",
                "attrId": "",
                "keyword": keyword,
                "pageIndex": str(page_idx + 1),
                "pageSize": "10",
                "language": "zh-cn",
                "area": "cn",
            }

            try:
                resp = session.get(
                    "https://careers.tencent.com/tencentcareer/api/post/Query",
                    params=params, timeout=15,
                )
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                logger.debug(f"  API 请求失败: {e}")
                break

            posts = data.get("Data", {}).get("Posts", [])
            page_jobs = []
            for job in posts:
                jd = self._tencent_parse_job(job)
                if jd:
                    page_jobs.append(jd)

            if not page_jobs:
                break

            all_jobs.extend(page_jobs)
            logger.debug(f"    第{page_idx+1}页: {len(page_jobs)} 条")
            time.sleep(random.uniform(2, 5))

        return all_jobs

    def _tencent_parse_job(self, job: dict) -> dict | None:
        try:
            title = job.get("RecruitPostName", "")
            if not self._is_ai_related(title):
                return None

            responsibility = job.get("Responsibility", "")
            requirement = job.get("Requirement", "") or ""
            jd_text = f"{responsibility}\n{requirement}".strip()

            if len(jd_text) < 50:
                return None

            city = job.get("LocationName", "")
            country = job.get("CountryName", "")
            if country and country != "中国":
                return None

            return {
                "title": title,
                "company": "腾讯",
                "salary": "",
                "city": city,
                "experience": "",
                "education": "",
                "jd_text": jd_text,
                "url": f"https://careers.tencent.com/jobdesc.html?postId={job.get('PostId', '')}",
                "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            }
        except Exception as e:
            logger.debug(f"解析腾讯岗位失败: {e}")
            return None

    # ──── 阿里巴巴（Playwright API 拦截）────

    def _scrape_alibaba(self, browser, config: dict) -> list[dict]:
        """阿里巴巴校招页 — 通过搜索页拦截 position/search API"""
        all_jds = []

        for keyword in config["search_keywords"]:
            logger.info(f"  搜索关键词: {keyword}")
            try:
                jds = self._alibaba_search(browser, keyword)
                all_jds.extend(jds)
                logger.info(f"    获取 {len(jds)} 条")
            except Exception as e:
                logger.warning(f"  关键词 '{keyword}' 搜索失败: {e}")
            time.sleep(random.uniform(KEYWORD_DELAY_MIN, KEYWORD_DELAY_MAX))

        return self._deduplicate(all_jds)

    def _alibaba_search(self, browser, keyword: str) -> list[dict]:
        all_jobs = []

        for page_idx in range(MAX_PAGES_PER_KEYWORD):
            context = browser.new_context()
            page = context.new_page()

            api_responses = []

            def handle_response(response):
                if 'position/search' in response.url:
                    try:
                        body = response.json()
                        api_responses.append(body)
                    except Exception:
                        pass

            page.on('response', handle_response)

            search_url = (
                f"https://campus-talent.alibaba.com/campus/position"
                f"?batchId=100000540002&keyword={keyword}&pageNo={page_idx + 1}"
            )

            try:
                page.goto(search_url, wait_until='networkidle', timeout=20000)
                page.wait_for_timeout(5000)
            except Exception as e:
                logger.debug(f"  页面加载超时: {e}")

            page_jobs = []
            for resp_data in api_responses:
                datas = resp_data.get('content', {}).get('datas', [])
                for job in datas:
                    jd = self._alibaba_parse_job(job)
                    if jd:
                        page_jobs.append(jd)

            page.close()
            context.close()

            if not page_jobs:
                break

            all_jobs.extend(page_jobs)
            logger.debug(f"    第{page_idx+1}页: {len(page_jobs)} 条")

        return all_jobs

    def _alibaba_parse_job(self, job: dict) -> dict | None:
        try:
            title = job.get("name", "")
            if not self._is_ai_related(title):
                return None

            description = job.get("description", "") or ""
            requirement = job.get("requirement", "") or ""
            jd_text = f"{description}\n{requirement}".strip()

            if len(jd_text) < 50:
                return None

            locations = job.get("workLocations", [])
            city = "/".join(locations) if locations else ""

            return {
                "title": title,
                "company": "阿里巴巴",
                "salary": "",
                "city": city,
                "experience": job.get("experience", "") or "",
                "education": job.get("degree", "") or "",
                "jd_text": jd_text,
                "url": f"https://campus-talent.alibaba.com/campus/position/detail?positionId={job.get('id', '')}",
                "department": job.get("department", "") or "",
                "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            }
        except Exception as e:
            logger.debug(f"解析阿里岗位失败: {e}")
            return None

    # ──── NVIDIA（Workday CXS API）────

    def _scrape_nvidia(self, browser, config: dict) -> list[dict]:
        """NVIDIA 招聘页 — 直接调用 Workday CXS API"""
        all_jds = []
        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Content-Type": "application/json",
            "Accept": "application/json",
        })

        for keyword in config["search_keywords"]:
            logger.info(f"  搜索关键词: {keyword}")
            try:
                jds = self._nvidia_search(session, keyword)
                all_jds.extend(jds)
                logger.info(f"    获取 {len(jds)} 条")
            except Exception as e:
                logger.warning(f"  关键词 '{keyword}' 搜索失败: {e}")
            time.sleep(random.uniform(2, 5))

        return self._deduplicate(all_jds)

    def _nvidia_search(self, session, keyword: str) -> list[dict]:
        all_jobs = []
        base_url = "https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite"
        detail_base = base_url

        for page_idx in range(MAX_PAGES_PER_KEYWORD):
            payload = {
                "appliedFacets": {},
                "limit": 20,
                "offset": page_idx * 20,
                "searchText": keyword,
            }

            try:
                resp = session.post(f"{base_url}/jobs", json=payload, timeout=15)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                logger.debug(f"  API 请求失败: {e}")
                break

            job_postings = data.get("jobPostings", [])
            if not job_postings:
                break

            page_jobs = []
            for job in job_postings:
                jd = self._nvidia_parse_job(session, detail_base, job)
                if jd:
                    page_jobs.append(jd)

            all_jobs.extend(page_jobs)
            logger.debug(f"    第{page_idx+1}页: {len(page_jobs)} 条")
            time.sleep(random.uniform(1, 3))

        return all_jobs

    def _nvidia_parse_job(self, session, detail_base: str, job: dict) -> dict | None:
        try:
            title = job.get("title", "")
            if not self._is_ai_related(title):
                return None

            # Get full job description via detail API
            path = job.get("externalPath", "")
            if not path:
                return None

            desc_text = ""
            location = job.get("locationsText", "")
            try:
                resp = session.get(f"{detail_base}{path}", timeout=10)
                if resp.status_code == 200:
                    detail = resp.json()
                    info = detail.get("jobPostingInfo", {})
                    html_desc = info.get("jobDescription", "")
                    if html_desc:
                        desc_text = self._strip_html(html_desc)
                    if not location:
                        location = info.get("location", "")
                time.sleep(random.uniform(0.5, 1.5))
            except Exception as e:
                logger.debug(f"  获取JD详情失败: {e}")

            if len(desc_text) < 50:
                return None

            return {
                "title": title,
                "company": "NVIDIA",
                "salary": "",
                "city": location,
                "experience": "",
                "education": "",
                "jd_text": desc_text,
                "url": f"https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite{path}",
                "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            }
        except Exception as e:
            logger.debug(f"解析NVIDIA岗位失败: {e}")
            return None

    # ──── 工具方法 ────

    def _is_ai_related(self, title: str) -> bool:
        ai_keywords = [
            "AI", "算法", "机器学习", "深度学习", "NLP", "CV", "大模型", "LLM",
            "推荐", "搜索", "语音", "视觉", "多模态", "知识图谱", "强化学习",
            "MLOps", "AI工程", "AI应用", "AI产品", "数据科学", "数据挖掘",
            "自然语言", "计算机视觉", "模型", "训练", "推理", "RAG", "Agent",
            "Prompt", "AIGC", "生成式", "自动驾驶", "机器人", "昇腾", "CUDA",
            "芯片", "联邦学习", "具身智能", "数字人",
            # English keywords for international companies
            "machine learning", "deep learning", "artificial intelligence",
            "neural network", "inference", "GPU", "tensor",
            "autonomous driving", "self-driving", "robotics",
            "computer vision", "speech recognition", "natural language",
            "large language model", "generative", "transformer",
            "reinforcement learning", "recommendation", "search engine",
        ]
        title_lower = title.lower()
        return any(kw.lower() in title_lower for kw in ai_keywords)

    def _strip_html(self, html: str) -> str:
        """去除 HTML 标签，返回纯文本"""
        import re
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"&nbsp;", " ", text)
        text = re.sub(r"&amp;", "&", text)
        text = re.sub(r"&lt;", "<", text)
        text = re.sub(r"&gt;", ">", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _deduplicate(self, jds: list[dict]) -> list[dict]:
        seen = set()
        unique = []
        for jd in jds:
            key = f"{jd.get('title', '')}@{jd.get('company', '')}"
            if key not in seen:
                seen.add(key)
                unique.append(jd)
        return unique

    def _save_raw(self, company_key: str, data: list[dict]):
        os.makedirs(RAW_DIR, exist_ok=True)
        filepath = os.path.join(RAW_DIR, f"{company_key}.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"已保存 {len(data)} 条JD到 {filepath}")
