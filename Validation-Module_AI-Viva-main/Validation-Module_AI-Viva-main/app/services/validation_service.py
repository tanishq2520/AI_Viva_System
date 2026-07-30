import logging
import threading
from typing import Dict, Any, Optional, List
import numpy as np
import requests
import json
import torch
import torch.jit
torch.jit.script = lambda obj, *args, **kwargs: obj

from transformers import AutoTokenizer, AutoModel, AutoModelForSequenceClassification, AutoModelForCausalLM, AutoModelForSeq2SeqLM
from rapidfuzz import fuzz

from app.config.config import settings, logger
from app.schemas.validation import (
    ValidationRequest,
    ValidationResponse,
    ValidationStatus,
    CompletenessStatus
)
from app.utils.text_processor import TextProcessor
from app.utils.exceptions import ModelLoadException, ValidationServiceException
from app.services.rag_service import RAGService

def mean_pooling(model_output, attention_mask):
    """
    Perform mean pooling on token embeddings, taking the attention mask into account.
    This mimics the pooling layer in sentence-transformers.
    """
    token_embeddings = model_output[0]  # First element of model_output contains all token embeddings
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
    sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
    return sum_embeddings / sum_mask

class ValidationService:
    """
    Singleton service class that performs ASR transcript validation, 
    multilingual semantic similarity matching using base Hugging Face transformers,
    and concept coverage checking.
    """
    _instance = None
    _lock = threading.Lock()
    _models: Dict[str, dict] = {}  # Caches dict mapping model_name -> {"model": model, "tokenizer": tokenizer}

    def __new__(cls, *args, **kwargs):
        """
        Thread-safe singleton pattern implementation.
        """
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ValidationService, cls).__new__(cls)
            return cls._instance

    def __init__(self):
        # Prevent re-initialization in singleton
        if not hasattr(self, "_initialized"):
            self.rag_service = RAGService(self)
            self._initialized = True

    def _get_model_for_language(self, language: str) -> dict:
        """
        Loads the AutoTokenizer and AutoModel dynamically based on language context.
        Supports lazy-loading and caching.
        """
        lang_lower = language.lower()
        is_english = "english" in lang_lower or lang_lower == "en"
        model_name = settings.MODEL_NAME if is_english else settings.MULTILINGUAL_MODEL_NAME

        # Resolve simple names to full HF model IDs if needed
        full_repo_name = model_name
        if "/" not in full_repo_name:
            full_repo_name = f"sentence-transformers/{full_repo_name}"

        with self._lock:
            if full_repo_name not in self._models:
                logger.info(f"Loading HF AutoModel/AutoTokenizer '{full_repo_name}' for language '{language}'...")
                try:
                    tokenizer = AutoTokenizer.from_pretrained(full_repo_name, trust_remote_code=True)
                    model = AutoModel.from_pretrained(full_repo_name, trust_remote_code=True, torch_dtype="auto")
                    self._models[full_repo_name] = {
                        "model": model,
                        "tokenizer": tokenizer
                    }
                    logger.info(f"Model and Tokenizer '{full_repo_name}' successfully loaded into memory.")
                except Exception as e:
                    logger.error(f"Error loading model '{full_repo_name}': {str(e)}", exc_info=True)
                    raise ModelLoadException(full_repo_name, str(e))
            
            return self._models[full_repo_name]

    def get_embedding(self, text: str, language: str = "English") -> np.ndarray:
        """
        Generates an embedding vector using base Transformers and PyTorch.
        """
        model_data = self._get_model_for_language(language)
        model = model_data["model"]
        tokenizer = model_data["tokenizer"]
        
        try:
            # Tokenize text
            encoded_input = tokenizer([text], padding=True, truncation=True, return_tensors='pt')
            
            # Compute token embeddings
            with torch.no_grad():
                model_output = model(**encoded_input)
                
            # Perform mean pooling
            sentence_embeddings = mean_pooling(model_output, encoded_input['attention_mask'])
            
            # Convert to 1D numpy array representing the sentence embedding vector
            return sentence_embeddings[0].cpu().numpy()
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}", exc_info=True)
            raise ValidationServiceException(f"Failed to generate embedding: {str(e)}", status_code=500)

    def _get_classification_model(self) -> dict:
        """
        Loads the classification AutoTokenizer and AutoModelForSequenceClassification.
        Supports lazy-loading and caching.
        """
        model_name = settings.CLASSIFICATION_MODEL_NAME
        with self._lock:
            if "classification" not in self._models:
                logger.info(f"Loading Zero-Shot Classification model '{model_name}'...")
                try:
                    tokenizer = AutoTokenizer.from_pretrained(model_name)
                    model = AutoModelForSequenceClassification.from_pretrained(model_name, torch_dtype="auto")
                    self._models["classification"] = {
                        "model": model,
                        "tokenizer": tokenizer
                    }
                    logger.info(f"Classification Model '{model_name}' successfully loaded.")
                except Exception as e:
                    logger.error(f"Error loading classification model '{model_name}': {str(e)}", exc_info=True)
                    raise ModelLoadException(model_name, str(e))
            
            return self._models["classification"]

    def zero_shot_classify(self, student_answer: str, expected_answer: str) -> bool:
        """
        Performs zero-shot classification to label whether the student answer is Valid or Invalid.
        Uses NLI entailment between student_answer (premise) and expected_answer relationship.
        """
        model_data = self._get_classification_model()
        model = model_data["model"]
        tokenizer = model_data["tokenizer"]
        
        try:
            hypothesis = f"This is related to: {expected_answer}."
            # Tokenize sequence: premise (student answer) and hypothesis
            inputs = tokenizer(student_answer, hypothesis, truncation=True, return_tensors='pt')
            
            # Predict NLI relationship
            with torch.no_grad():
                outputs = model(**inputs)
                
            probs = torch.softmax(outputs.logits, dim=-1)[0]
            
            # Parse labels dynamically from config
            id2label = model.config.id2label
            label2id = {v.lower(): k for k, v in id2label.items()}
            entail_idx = label2id.get("entailment", 0)
            contradict_idx = label2id.get("contradiction", 2)
            
            entail_prob = float(probs[entail_idx].item())
            contradict_prob = float(probs[contradict_idx].item())
            
            logger.info(f"Zero-shot NLI probabilities - Entailment: {entail_prob:.4f}, Contradiction: {contradict_prob:.4f}")
            
            # Label is valid if entailment probability is higher than contradiction, 
            # or is at least 0.20 (representing a non-contradicting, meaningful attempt)
            return entail_prob >= 0.20 or entail_prob > contradict_prob
        except Exception as e:
            logger.error(f"Error in zero-shot classification: {str(e)}", exc_info=True)
            # Default fallback if classification model fails
            return True

    def _get_qa_model(self) -> dict:
        """
        Loads the local QA AutoTokenizer and AutoModelForCausalLM.
        Supports lazy-loading and caching.
        """
        model_name = settings.QA_MODEL_NAME
        with self._lock:
            if "qa" not in self._models:
                logger.info(f"Loading local QA CausalLM model '{model_name}'...")
                try:
                    tokenizer = AutoTokenizer.from_pretrained(model_name)
                    model = AutoModelForCausalLM.from_pretrained(
                        model_name, 
                        torch_dtype="auto", 
                        device_map="auto" if torch.cuda.is_available() else None
                    )
                    self._models["qa"] = {
                        "model": model,
                        "tokenizer": tokenizer
                    }
                    logger.info(f"Local QA Model '{model_name}' successfully loaded.")
                except Exception as e:
                    logger.error(f"Error loading local QA model '{model_name}': {str(e)}", exc_info=True)
                    raise ModelLoadException(model_name, str(e))
            
            return self._models["qa"]

    def _validate_with_local_llm(self, request: ValidationRequest) -> Optional[ValidationResponse]:
        """
        Performs validation using the local DragonLLM Llama model for Question Answering.
        """
        model_data = self._get_qa_model()
        model = model_data["model"]
        tokenizer = model_data["tokenizer"]
        
        try:
            prompt = f"""[INST] You are the Validation Module of an AI-based Viva System.
Analyze the student's answer against the expected reference answer.

Question: "{request.question}"
Expected Reference Answer: "{request.expected_answer}"
Student Answer Transcript: "{request.student_answer}"

Evaluate the student's response on relevance, semantic similarity, and completeness.
Output the result strictly in this JSON format:
{{
  "validation_status": "Valid" or "Invalid",
  "relevance_score": float between 0.0 and 1.0,
  "semantic_similarity": float between 0.0 and 1.0,
  "completeness": "Complete", "Partially Complete", or "Irrelevant",
  "confidence": float between 0.0 and 1.0,
  "remarks": "qualitative explanation"
}}
[/INST]"""
            inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
            
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=256,
                    temperature=0.1,
                    do_sample=False
                )
                
            generated_tokens = outputs[0][inputs.input_ids.shape[-1]:]
            response_text = tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()
            
            start_idx = response_text.find("{")
            end_idx = response_text.rfind("}") + 1
            if start_idx != -1 and end_idx != -1:
                json_str = response_text[start_idx:end_idx]
                parsed = json.loads(json_str)
                
                llm_comp = parsed["completeness"]
                if llm_comp == "Complete":
                    completeness_status = CompletenessStatus.COMPLETE
                elif llm_comp == "Partially Complete":
                    completeness_status = CompletenessStatus.PARTIALLY_COMPLETE
                else:
                    completeness_status = CompletenessStatus.IRRELEVANT
                    
                return ValidationResponse(
                    validation_status=ValidationStatus.VALID if parsed["validation_status"] == "Valid" else ValidationStatus.INVALID,
                    relevance_score=round(parsed["relevance_score"], 2),
                    semantic_similarity=round(parsed["semantic_similarity"], 2),
                    completeness=completeness_status,
                    confidence=round(parsed["confidence"], 2),
                    remarks=parsed["remarks"]
                )
        except Exception as e:
            logger.error(f"Error in local QA model validation: {str(e)}", exc_info=True)
            return None

    def _get_feedback_model(self) -> dict:
        """
        Loads the feedback generation AutoTokenizer and AutoModelForCausalLM.
        Supports lazy-loading and caching.
        """
        model_name = settings.FEEDBACK_MODEL_NAME
        with self._lock:
            if "feedback" not in self._models:
                logger.info(f"Loading local feedback generation model '{model_name}'...")
                try:
                    tokenizer = AutoTokenizer.from_pretrained(model_name)
                    model = AutoModelForCausalLM.from_pretrained(
                        model_name, 
                        torch_dtype="auto", 
                        device_map="auto" if torch.cuda.is_available() else None
                    )
                    self._models["feedback"] = {
                        "model": model,
                        "tokenizer": tokenizer
                    }
                    logger.info(f"Feedback Generation Model '{model_name}' successfully loaded.")
                except Exception as e:
                    logger.error(f"Error loading feedback model '{model_name}': {str(e)}", exc_info=True)
                    raise ModelLoadException(model_name, str(e))
            
            return self._models["feedback"]

    def _generate_qualitative_feedback(self, request: ValidationRequest, score: float, completeness: str) -> str:
        """
        Generates qualitative feedback remarks using the nvidia/Nemotron-Labs-Audex-30B-A3B model.
        """
        model_data = self._get_feedback_model()
        model = model_data["model"]
        tokenizer = model_data["tokenizer"]
        
        try:
            prompt = f"""[INST] You are an AI tutor in a viva examination.
Generate a constructive and professional feedback remark for the student based on their response.

Question: "{request.question}"
Expected Answer: "{request.expected_answer}"
Student Answer: "{request.student_answer}"
Evaluation Score: {score}/1.0
Completeness Level: {completeness}

Provide a concise feedback remark (1-2 sentences):
[/INST]"""
            inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=128,
                    temperature=0.7,
                    do_sample=True
                )
            generated_tokens = outputs[0][inputs.input_ids.shape[-1]:]
            feedback = tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()
            return feedback
        except Exception as e:
            logger.error(f"Error generating qualitative feedback using local generation model: {str(e)}", exc_info=True)
            return "Answer evaluated using local scoring engine."

    def _get_translation_model(self) -> dict:
        """
        Loads the translation AutoTokenizer and AutoModelForSeq2SeqLM.
        Supports lazy-loading and caching.
        """
        model_name = settings.TRANSLATION_MODEL_NAME
        with self._lock:
            if "translation" not in self._models:
                logger.info(f"Loading local translation model '{model_name}'...")
                try:
                    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
                    model = AutoModelForSeq2SeqLM.from_pretrained(
                        model_name, 
                        trust_remote_code=True, 
                        torch_dtype="auto", 
                        device_map="auto" if torch.cuda.is_available() else None
                    )
                    self._models["translation"] = {
                        "model": model,
                        "tokenizer": tokenizer
                    }
                    logger.info(f"Translation Model '{model_name}' successfully loaded.")
                except Exception as e:
                    logger.error(f"Error loading translation model '{model_name}': {str(e)}", exc_info=True)
                    raise ModelLoadException(model_name, str(e))
            
            return self._models["translation"]

    def translate_to_english(self, text: str, language: str) -> str:
        """
        Translates text from an Indic language to English for future multilingual support.
        """
        lang_lower = language.lower()
        if "english" in lang_lower or lang_lower == "en":
            return text
            
        model_data = self._get_translation_model()
        model = model_data["model"]
        tokenizer = model_data["tokenizer"]
        
        try:
            inputs = tokenizer(text, return_tensors="pt").to(model.device)
            with torch.no_grad():
                outputs = model.generate(**inputs, max_length=512)
            translated = tokenizer.decode(outputs[0], skip_special_tokens=True).strip()
            logger.info(f"Translated '{text[:30]}...' from {language} to English: '{translated[:30]}...'")
            return translated
        except Exception as e:
            logger.error(f"Error translating text using local translation model: {str(e)}", exc_info=True)
            return text

    def _validate_with_llm(self, request: ValidationRequest) -> Optional[ValidationResponse]:
        """
        Performs high-fidelity validation using Gemini API with forced JSON response schema.
        """
        api_key = settings.GEMINI_API_KEY
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        
        prompt = f"""
You are the Validation Module of an AI-based Viva System (supporting English and Indian languages).
Verify whether the student's response transcript is relevant, semantically correct, complete, and reliable compared to the examiner's reference answer.

Inputs:
Language: {request.language}
Question: "{request.question}"
Expected Reference Answer: "{request.expected_answer}"
Student Answer Transcript: "{request.student_answer}"

Evaluate the student's response based on the following criteria:
1. **Relevance**: Alignment between student answer and question context (Score 0.0 to 1.0).
2. **Semantic Similarity**: Cosine semantic match compared to reference answer (Score 0.0 to 1.0).
3. **Completeness**: Semantic coverage of key reference concepts:
   - "Complete" (covers >= 75% of key concepts)
   - "Partially Complete" (covers 35% to 74% of key concepts)
   - "Irrelevant" (covers < 35% of key concepts)
4. **Validation Status**: "Valid" if Relevance >= 0.4 and Semantic Similarity >= 0.45. Otherwise "Invalid".
5. **Confidence**: Overall score (0.0 to 1.0) combining matching confidence.
6. **Remarks**: Qualitative statement explaining the decision.

Respond strictly in JSON matching the requested schema.
"""
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "validation_status": { "type": "STRING", "enum": ["Valid", "Invalid"] },
                        "relevance_score": { "type": "NUMBER" },
                        "semantic_similarity": { "type": "NUMBER" },
                        "completeness": { "type": "STRING", "enum": ["Complete", "Partially Complete", "Irrelevant"] },
                        "confidence": { "type": "NUMBER" },
                        "remarks": { "type": "STRING" }
                    },
                    "required": ["validation_status", "relevance_score", "semantic_similarity", "completeness", "confidence", "remarks"]
                }
            }
        }
        
        try:
            response = requests.post(url, json=payload, timeout=15.0)
            if response.status_code != 200:
                logger.error(f"Gemini API error (status {response.status_code}): {response.text}")
                return None
                
            result = response.json()
            text_response = result["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(text_response)
            
            # Map completeness status from LLM enum to CompletenessStatus Enum
            llm_comp = parsed["completeness"]
            if llm_comp == "Complete":
                completeness_status = CompletenessStatus.COMPLETE
            elif llm_comp == "Partially Complete":
                completeness_status = CompletenessStatus.PARTIALLY_COMPLETE
            else:
                completeness_status = CompletenessStatus.IRRELEVANT
                
            return ValidationResponse(
                validation_status=ValidationStatus.VALID if parsed["validation_status"] == "Valid" else ValidationStatus.INVALID,
                relevance_score=round(parsed["relevance_score"], 2),
                semantic_similarity=round(parsed["semantic_similarity"], 2),
                completeness=completeness_status,
                confidence=round(parsed["confidence"], 2),
                remarks=parsed["remarks"]
            )
        except Exception as e:
            logger.error(f"Exception calling Gemini LLM engine: {str(e)}", exc_info=True)
            return None

    def validate_answer(self, request: ValidationRequest) -> ValidationResponse:
        """
        Validates the transcript quality and calculates semantic and completeness metrics.
        """
        logger.info(f"Validating response for language: {request.language}")
        
        # RAG Extension: Retrieve Reference Answer if expected_answer is not provided
        if not request.expected_answer or request.expected_answer.strip() == "":
            logger.info("Expected reference answer not provided. Retrieving from RAG Knowledge Base...")
            retrieved = self.rag_service.retrieve_reference_answer(request.question, request.language)
            if retrieved:
                request.expected_answer = retrieved
                logger.info(f"RAG Retrieved expected answer: '{retrieved}'")
            else:
                logger.warning("RAG retrieval yielded empty result. Defaulting expected answer to empty string.")

        # Check if translation is requested for future multilingual support
        translate_input = False
        if request.speech_metadata and isinstance(request.speech_metadata, dict):
            translate_input = request.speech_metadata.get("translate_input", False)
            
        if translate_input:
            logger.info("Translating inputs to English for validation...")
            request.student_answer = self.translate_to_english(request.student_answer, request.language)
            request.expected_answer = self.translate_to_english(request.expected_answer, request.language)
            request.question = self.translate_to_english(request.question, request.language)
            # Switch language context to English after translation
            request.language = "English"

        # Check if LLM validation is explicitly requested and key is configured
        use_llm = False
        if request.speech_metadata and isinstance(request.speech_metadata, dict):
            use_llm = request.speech_metadata.get("use_llm", False)
            
        if use_llm:
            if settings.GEMINI_API_KEY:
                logger.info("Routing request to Gemini LLM Engine...")
                llm_response = self._validate_with_llm(request)
                if llm_response:
                    return llm_response
                logger.warning("LLM validation failed. Falling back to Local NLP Engine.")
            else:
                logger.warning("use_llm=True requested but GEMINI_API_KEY is not configured. Using Local NLP Engine.")

        # Check if local LLM QA validation is requested
        use_local_llm = False
        if request.speech_metadata and isinstance(request.speech_metadata, dict):
            use_local_llm = request.speech_metadata.get("use_local_llm", False)
            
        if use_local_llm:
            logger.info("Routing request to local QA LLM Engine...")
            local_llm_response = self._validate_with_local_llm(request)
            if local_llm_response:
                return local_llm_response
            logger.warning("Local QA LLM validation failed. Falling back to Local NLP Engine.")

        # Step 1: Text Cleaning & Normalization (remove fillers to compute high-quality semantic matches)
        cleaned_student = TextProcessor.clean_text(request.student_answer, request.language, remove_fillers=True)
        cleaned_expected = TextProcessor.clean_text(request.expected_answer, request.language, remove_fillers=True)
        cleaned_question = TextProcessor.clean_text(request.question, request.language, remove_fillers=True)

        # Step 2: Transcript Quality Check (ASR Sanity check)
        is_valid_transcript, quality_remark, quality_score = TextProcessor.validate_transcript_quality(
            request.student_answer, 
            cleaned_student
        )

        if not is_valid_transcript:
            logger.warning(f"Transcript failed quality checks: {quality_remark}")
            return ValidationResponse(
                validation_status=ValidationStatus.INVALID,
                relevance_score=0.0,
                semantic_similarity=0.0,
                completeness=CompletenessStatus.IRRELEVANT,
                confidence=quality_score,
                remarks=f"Invalid response attempt. {quality_remark}"
            )

        # Step 3: Compute Embeddings using the language-appropriate model
        student_emb = self.get_embedding(cleaned_student, request.language)
        expected_emb = self.get_embedding(cleaned_expected, request.language)
        question_emb = self.get_embedding(cleaned_question, request.language)

        # Step 4: Calculate Cosine Similarities manually
        def calculate_cos_sim(vec1: np.ndarray, vec2: np.ndarray) -> float:
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            if norm1 == 0 or norm2 == 0:
                return 0.0
            return float(np.dot(vec1, vec2) / (norm1 * norm2))

        raw_sim = calculate_cos_sim(student_emb, expected_emb)
        raw_q_sim = calculate_cos_sim(student_emb, question_emb)

        # Normalize score bounds to [0.0, 1.0]
        semantic_similarity = round(max(0.0, min(1.0, raw_sim)), 2)
        question_similarity = round(max(0.0, min(1.0, raw_q_sim)), 2)

        # Step 5: Calculate Relevance Score
        # Relevance blending similarity to expected answer (65%) and similarity to question topic (35%)
        relevance_score = round((0.65 * semantic_similarity) + (0.35 * question_similarity), 2)

        # Step 6: Dynamic Keyword-Level Concept Coverage for Completeness
        expected_concepts = TextProcessor.extract_concepts(request.expected_answer, request.language)
        student_tokens = cleaned_student.split()
        
        matched_count = 0
        if expected_concepts:
            for concept in expected_concepts:
                # 1. Direct match check
                if concept in student_tokens:
                    matched_count += 1
                    continue
                # 2. Fuzzy match check (ratio >= 85) for speech and transliteration typos
                matched = False
                for token in student_tokens:
                    if fuzz.ratio(concept, token) >= 85:
                        matched = True
                        break
                if matched:
                    matched_count += 1
            
            coverage_ratio = matched_count / len(expected_concepts)
        else:
            coverage_ratio = 1.0

        # Step 7: Decide Completeness Status based on concept coverage
        if coverage_ratio >= 0.60:
            completeness = CompletenessStatus.COMPLETE
            remarks = f"Answer is relevant and semantically correct. Concept coverage: {int(coverage_ratio * 100)}%."
        elif coverage_ratio >= 0.30:
            completeness = CompletenessStatus.PARTIALLY_COMPLETE
            remarks = f"Answer is relevant but lacks completeness. Concept coverage: {int(coverage_ratio * 100)}%."
        else:
            completeness = CompletenessStatus.IRRELEVANT
            remarks = "Answer lacks critical concepts or is off-topic."

        # Step 8: Establish overall Validation Status using Zero-Shot NLI Classification model
        is_valid_category = self.zero_shot_classify(cleaned_student, cleaned_expected)

        if completeness == CompletenessStatus.IRRELEVANT or not is_valid_category:
            validation_status = ValidationStatus.INVALID
            if completeness == CompletenessStatus.IRRELEVANT:
                remarks = "Answer is irrelevant or fails concept completeness."
            else:
                remarks = "Answer is irrelevant to the question topic."
        else:
            validation_status = ValidationStatus.VALID

        # Check if local qualitative feedback generation is requested via speech_metadata
        generate_feedback = False
        if request.speech_metadata and isinstance(request.speech_metadata, dict):
            generate_feedback = request.speech_metadata.get("generate_feedback", False)
            
        if generate_feedback and validation_status == ValidationStatus.VALID:
            logger.info("Generating qualitative feedback using local feedback model...")
            remarks = self._generate_qualitative_feedback(request, semantic_similarity, completeness.value)

        # Step 9: Calculate overall validation Confidence
        # Combine transcript quality (30%) and semantic similarity confidence (70%)
        confidence = round((0.3 * quality_score) + (0.7 * semantic_similarity), 2)

        logger.info(f"Validation successful. Status: {validation_status.value}, Similarity: {semantic_similarity}, Completeness: {completeness.value}")

        return ValidationResponse(
            validation_status=validation_status,
            relevance_score=relevance_score,
            semantic_similarity=semantic_similarity,
            completeness=completeness,
            confidence=confidence,
            remarks=remarks
        )
