from typing import List, Dict, Any
import numpy as np
from app.config.config import settings, logger

class RAGService:
    def __init__(self, embedding_service):
        self.embedding_service = embedding_service
        # In-memory curriculum knowledge base of reference answers
        self.knowledge_base = [
            {
                "question": "What is an operating system and what does it do?",
                "reference_answer": "An operating system is software that acts as an interface between computer hardware and the user. It manages files, memory, processes, and input/output devices."
            },
            {
                "question": "ऑपरेटिंग सिस्टम क्या है और यह क्या करता है?",
                "reference_answer": "ऑपरेटिंग सिस्टम एक सॉफ्टवेयर है जो कंप्यूटर हार्डवेयर और उपयोगकर्ता के बीच इंटरफेस के रूप में कार्य करता है। यह फाइलों, मेमोरी और प्रक्रियाओं का प्रबंधन करता है।"
            },
            {
                "question": "List the components of a CPU.",
                "reference_answer": "Control Unit, Arithmetic Logic Unit, and Registers."
            },
            {
                "question": "What is the capital of India?",
                "reference_answer": "New Delhi is the capital city of India."
            },
            {
                "question": "What is a GPU?",
                "reference_answer": "Graphics Processing Unit"
            },
            {
                "question": "What is RAM?",
                "reference_answer": "Random Access Memory"
            }
        ]
        self._precompute_embeddings()

    def _precompute_embeddings(self):
        """Precomputes embeddings for all questions in the knowledge base."""
        logger.info("Precomputing RAG knowledge base embeddings...")
        for item in self.knowledge_base:
            # Determine language based on script heuristics
            language = "Hindi" if any('\u0900' <= char <= '\u097f' for char in item["question"]) else "English"
            item["embedding"] = self.embedding_service.get_embedding(item["question"], language)

    def retrieve_reference_answer(self, question: str, language: str) -> str:
        """
        Retrieves the most semantically relevant reference answer from the knowledge base.
        """
        if not self.knowledge_base:
            return ""

        query_emb = self.embedding_service.get_embedding(question, language)
        best_similarity = -1.0
        best_answer = ""

        for item in self.knowledge_base:
            ref_emb = item["embedding"]
            norm1 = np.linalg.norm(query_emb)
            norm2 = np.linalg.norm(ref_emb)
            if norm1 == 0 or norm2 == 0:
                similarity = 0.0
            else:
                similarity = float(np.dot(query_emb, ref_emb) / (norm1 * norm2))

            if similarity > best_similarity:
                best_similarity = similarity
                best_answer = item["reference_answer"]

        logger.info(f"RAG Retrieval: Best match similarity = {best_similarity:.4f}")
        return best_answer
