"""RAG 语义搜索服务：内存向量索引 + 混合搜索"""

import math
import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.position import Position
from ..config import get_settings
from .glm_client import get_glm_client

logger = logging.getLogger(__name__)


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class EmbeddingService:
    def __init__(self):
        self._vectors: dict[str, list[float]] = {}  # position_id -> embedding
        self._texts: dict[str, str] = {}  # position_id -> searchable text
        self._loaded = False

    async def build_index(self, db: AsyncSession):
        if self._loaded:
            return

        logger.info("Building embedding index...")
        result = await db.execute(select(Position))
        positions = result.scalars().all()

        if not positions:
            logger.warning("No positions found, skipping index build")
            return

        # Build searchable text for each position
        for pos in positions:
            self._texts[pos.id] = " ".join(filter(None, [
                pos.name, pos.name_en, pos.summary, pos.positioning,
            ]))

        settings = get_settings()
        if not settings.glm_api_key:
            logger.info("GLM_API_KEY is not configured; semantic vector index disabled")
            self._loaded = True
            return

        # Batch embed (max 16 per request for 智谱 API)
        client = get_glm_client()
        ids = list(self._texts.keys())
        batch_size = 16

        for i in range(0, len(ids), batch_size):
            batch_ids = ids[i:i + batch_size]
            batch_texts = [self._texts[pid] for pid in batch_ids]
            try:
                vectors = await client.embed(batch_texts)
                for pid, vec in zip(batch_ids, vectors):
                    self._vectors[pid] = vec
            except Exception as e:
                logger.error(f"Embedding batch {i//batch_size} failed: {e}")
                # Continue with partial index

        self._loaded = True
        logger.info(f"Embedding index built: {len(self._vectors)} positions")

    async def search(self, query: str, db: AsyncSession, top_k: int = 10,
                     vector_weight: float = 0.7) -> list[dict]:
        """混合搜索：向量相似度 + 关键词匹配"""
        if not self._loaded:
            await self.build_index(db)

        # Vector search
        vector_scores: dict[str, float] = {}
        if self._vectors:
            try:
                client = get_glm_client()
                query_vecs = await client.embed([query])
                query_vec = query_vecs[0]
                for pid, vec in self._vectors.items():
                    vector_scores[pid] = cosine_similarity(query_vec, vec)
            except Exception as e:
                logger.error(f"Query embedding failed: {e}")

        # Keyword search (ilike)
        keyword_scores: dict[str, float] = {}
        q = f"%{query}%"
        stmt = select(Position).where(
            (Position.name.ilike(q)) |
            (Position.name_en.ilike(q)) |
            (Position.summary.ilike(q))
        )
        result = await db.execute(stmt)
        for pos in result.scalars().all():
            # Simple scoring: name match = 1.0, others = 0.6
            if query.lower() in (pos.name or "").lower():
                keyword_scores[pos.id] = 1.0
            else:
                keyword_scores[pos.id] = 0.6

        # Merge scores
        all_ids = set(vector_scores.keys()) | set(keyword_scores.keys())
        merged = []
        for pid in all_ids:
            v_score = vector_scores.get(pid, 0.0)
            k_score = keyword_scores.get(pid, 0.0)
            final = vector_weight * v_score + (1 - vector_weight) * k_score
            merged.append((pid, final))

        merged.sort(key=lambda x: x[1], reverse=True)
        top_ids = [pid for pid, _ in merged[:top_k]]

        # Fetch position details
        if not top_ids:
            return []

        result = await db.execute(
            select(Position).where(Position.id.in_(top_ids))
        )
        positions = {p.id: p for p in result.scalars().all()}

        # Return in score order
        return [
            {
                "id": pid,
                "name": positions[pid].name,
                "name_en": positions[pid].name_en,
                "summary": positions[pid].summary,
                "score": round(score, 4),
            }
            for pid, score in merged[:top_k]
            if pid in positions
        ]


_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    global _service
    if _service is None:
        _service = EmbeddingService()
    return _service
