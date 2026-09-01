import logging
import hashlib
import uuid
from typing import Dict, Any, Optional
from app.agents.intake_agent import IntakeAgent
from app.agents.linguistic_risk_agent import LinguisticRiskAgent
from app.agents.verification_agent import VerificationAgent
from app.agents.reasoning_agent import ReasoningAgent
from app.agents.recommendation_agent import RecommendationAgent

logger = logging.getLogger("safe_hire.pipeline")

class AgentPipeline:
    """Orchestrates the 5-Agent AI pipeline sequentially with complete traceability."""

    def __init__(self):
        self.intake_agent = IntakeAgent()
        self.linguistic_agent = LinguisticRiskAgent()
        self.verification_agent = VerificationAgent()
        self.reasoning_agent = ReasoningAgent()
        self.recommendation_agent = RecommendationAgent()

    async def run(
        self,
        input_text: str = "",
        image_bytes: bytes = None,
        filename: str = "",
        input_url: str = "",
        target_language: str = None
    ) -> dict:
        request_id = str(uuid.uuid4())[:8]
        input_sample = f"{input_text[:50]}_{filename}_{input_url[:30]}_{len(image_bytes) if image_bytes else 0}"
        input_hash = hashlib.sha256(input_sample.encode("utf-8", errors="ignore")).hexdigest()[:12]

        logger.info(f"[{request_id}] START PIPELINE RUN — input_hash={input_hash}")

        # --- STAGE 1: Intake Agent (Ingestion, OCR, Multimodal Vision Classification) ---
        logger.info(f"[{request_id}] Stage 1: Intake Agent executing...")
        intake_res = self.intake_agent.process(
            input_text=input_text,
            image_bytes=image_bytes,
            filename=filename,
            input_url=input_url,
            target_language=target_language
        ) or {}

        content_type = intake_res.get("content_type", "job_poster")
        is_job_poster = intake_res.get("is_job_poster", True)
        ocr_status = intake_res.get("ocr_status", "NOT_APPLICABLE")
        final_lang = intake_res.get("final_language", "en")
        cleaned_text = intake_res.get("cleaned_text", "")
        domain = intake_res.get("domain", "")

        logger.info(f"[{request_id}] Stage 1 COMPLETE: content_type={content_type}, is_job={is_job_poster}, ocr_status={ocr_status}, lang={final_lang}")

        # --- STAGE 2: Linguistic Risk Agent ---
        logger.info(f"[{request_id}] Stage 2: Linguistic Risk Agent executing...")
        linguistic_res = self.linguistic_agent.analyze(cleaned_text, final_lang) or {}
        logger.info(f"[{request_id}] Stage 2 COMPLETE: linguistic_score={linguistic_res.get('linguistic_score')}, has_payment={linguistic_res.get('has_payment_demand')}")

        # --- STAGE 3: Verification Agent (WHOIS, Safe Browsing, Email) ---
        logger.info(f"[{request_id}] Stage 3: Verification Agent executing...")
        claimed_brand = linguistic_res.get("claimed_brand") or intake_res.get("claimed_brand")
        extracted_emails = (intake_res.get("metadata_extracted") or {}).get("emails", [])
        verification_res = self.verification_agent.verify(
            text=cleaned_text,
            domain=domain,
            claimed_brand=claimed_brand,
            emails=extracted_emails
        ) or {}
        logger.info(f"[{request_id}] Stage 3 COMPLETE: domain={verification_res.get('domain')}, trust_score={verification_res.get('verification_trust_score')}")

        # --- STAGE 4: Reasoning Agent (Multimodal Synthesis & Evidence-Based Audit) ---
        logger.info(f"[{request_id}] Stage 4: Reasoning Agent executing...")
        reasoning_res = self.reasoning_agent.synthesize(
            intake_data=intake_res,
            linguistic_data=linguistic_res,
            verification_data=verification_res,
            language=final_lang,
            image_bytes=image_bytes
        ) or {}

        scam_score = reasoning_res.get("scam_score")
        risk_level = reasoning_res.get("risk_level", "Low Apparent Risk")
        logger.info(f"[{request_id}] Stage 4 COMPLETE: scam_score={scam_score}, risk_level={risk_level}")

        # --- STAGE 5: Recommendation Agent ---
        logger.info(f"[{request_id}] Stage 5: Recommendation Agent executing...")
        recommendations = self.recommendation_agent.generate_recommendations(
            scam_score=scam_score,
            risk_factors=linguistic_res,
            verification_data=verification_res,
            language=final_lang,
            reasoning_data=reasoning_res,
            intake_data=intake_res
        ) or []
        logger.info(f"[{request_id}] Stage 5 COMPLETE: {len(recommendations)} recommendations generated")

        sub_scores = reasoning_res.get("sub_scores")
        if not isinstance(sub_scores, dict):
            sub_scores = {
                "financial_fee_risk": 0 if not is_job_poster else 10,
                "impersonation_risk": 0 if not is_job_poster else 10,
                "domain_reputation_risk": 0 if not is_job_poster else 10,
                "urgency_pressure_risk": 0 if not is_job_poster else 10
            }

        breakdown_signals = reasoning_res.get("breakdown_signals")
        if not isinstance(breakdown_signals, list):
            breakdown_signals = []

        explanation_text = reasoning_res.get("explanation", "")

        # Dynamic translation via Valsea / Gemini if target language is non-English
        if final_lang and final_lang.lower() not in ["en", "english"]:
            try:
                from app.agents.valsea_agent import valsea_translator
                valsea_res = valsea_translator.translate_report_components(
                    explanation_text,
                    recommendations,
                    breakdown_signals,
                    final_lang
                )
                if valsea_res and valsea_res.get("explanation_text"):
                    explanation_text = valsea_res.get("explanation_text")
                    recommendations = valsea_res.get("recommendations") or recommendations
                    breakdown_signals = valsea_res.get("breakdown_signals") or breakdown_signals
                    logger.info(f"[{request_id}] Valsea AI translated output to '{final_lang}'")
            except Exception as valsea_err:
                logger.info(f"[{request_id}] Valsea translation notice: {valsea_err}")

        logger.info(f"[{request_id}] PIPELINE RUN FINISHED SUCCESS — final_score={scam_score}, risk={risk_level}")

        return {
            "request_id": request_id,
            "intake_data": intake_res,
            "linguistic_data": linguistic_res,
            "verification_data": verification_res,
            "reasoning_data": reasoning_res,
            "recommendations": recommendations,
            "scam_score": scam_score,
            "confidence_score": reasoning_res.get("confidence_score", 95),
            "sub_scores": sub_scores,
            "breakdown_signals": breakdown_signals,
            "risk_level": risk_level,
            "language": final_lang,
            "explanation_text": explanation_text,
            "verified_facts": reasoning_res.get("verified_facts") or intake_res.get("verified_facts") or [],
            "ai_inferences": reasoning_res.get("ai_inferences") or []
        }

pipeline_runner = AgentPipeline()
