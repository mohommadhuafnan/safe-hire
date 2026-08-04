import logging
from app.agents.intake_agent import IntakeAgent
from app.agents.linguistic_risk_agent import LinguisticRiskAgent
from app.agents.verification_agent import VerificationAgent
from app.agents.reasoning_agent import ReasoningAgent
from app.agents.recommendation_agent import RecommendationAgent

logger = logging.getLogger("safe_hire.pipeline")

class AgentPipeline:
    """Orchestrates the 5-Agent AI pipeline sequentially."""

    def __init__(self):
        self.intake_agent = IntakeAgent()
        self.linguistic_agent = LinguisticRiskAgent()
        self.verification_agent = VerificationAgent()
        self.reasoning_agent = ReasoningAgent()
        self.recommendation_agent = RecommendationAgent()

    async def run(self, input_text: str = "", image_bytes: bytes = None, input_url: str = "", target_language: str = None) -> dict:
        logger.info("Executing Agent Pipeline Stage 1: Intake Agent")
        intake_res = self.intake_agent.process(input_text, image_bytes, input_url, target_language)

        cleaned_text = intake_res.get("cleaned_text", "")
        final_lang = intake_res.get("final_language", "en")
        domain = intake_res.get("domain", "")

        # Check if non-job picture was uploaded (e.g., selfie, animal photo, nature landscape)
        if intake_res.get("is_job_poster") is False:
            validation_msg = intake_res.get("validation_error", "⚠️ NON-JOB POSTER DETECTED: This image does not contain any recruitment flyer, job advertisement, or career offer details.")
            return {
                "intake_data": intake_res,
                "linguistic_data": {},
                "verification_data": {},
                "reasoning_data": {},
                "recommendations": [
                    "Please upload a valid job advertisement screenshot, recruitment flyer, or paste a job posting URL.",
                    "Avoid uploading photos of people, animals, pets, or non-career related pictures."
                ],
                "scam_score": 100,
                "confidence_score": 100,
                "sub_scores": {
                    "financial_fee_risk": 100,
                    "impersonation_risk": 100,
                    "domain_reputation_risk": 100,
                    "urgency_pressure_risk": 100
                },
                "risk_level": "Non-Job Image (100% Risk Alert)",
                "language": final_lang,
                "explanation_text": f"{validation_msg}\n\nUploading non-career images (personal photos, animals, or unrelated pictures) cannot be verified for recruitment authenticity and is flagged with a 100% Risk Alert."
            }

        logger.info("Executing Agent Pipeline Stage 2: Linguistic Risk Agent")
        linguistic_res = self.linguistic_agent.analyze(cleaned_text, final_lang)

        logger.info("Executing Agent Pipeline Stage 3: Verification Agent")
        claimed_brand = linguistic_res.get("claimed_brand") or intake_res.get("claimed_brand")
        extracted_emails = (intake_res.get("metadata_extracted") or {}).get("emails", [])
        verification_res = self.verification_agent.verify(cleaned_text, domain, claimed_brand, emails=extracted_emails)

        logger.info("Executing Agent Pipeline Stage 4: Reasoning Agent (Multimodal Vision AI & Gemini 3.6 Flash)")
        reasoning_res = self.reasoning_agent.synthesize(intake_res, linguistic_res, verification_res, final_lang, image_bytes)

        logger.info("Executing Agent Pipeline Stage 5: Recommendation Agent")
        scam_score = reasoning_res.get("scam_score", 0)
        recommendations = self.recommendation_agent.generate_recommendations(
            scam_score=scam_score,
            risk_factors=linguistic_res,
            verification_data=verification_res,
            language=final_lang,
            reasoning_data=reasoning_res,
            intake_data=intake_res
        )

        return {
            "intake_data": intake_res,
            "linguistic_data": linguistic_res,
            "verification_data": verification_res,
            "reasoning_data": reasoning_res,
            "recommendations": recommendations,
            "scam_score": scam_score,
            "confidence_score": reasoning_res.get("confidence_score", 98),
            "sub_scores": reasoning_res.get("sub_scores", {}),
            "breakdown_signals": reasoning_res.get("breakdown_signals", []),
            "risk_level": reasoning_res.get("risk_level", "Low Risk"),
            "language": final_lang,
            "explanation_text": reasoning_res.get("explanation", "")
        }


pipeline_runner = AgentPipeline()
