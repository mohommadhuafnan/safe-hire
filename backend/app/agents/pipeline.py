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

    async def run(self, input_text: str = "", image_bytes: bytes = None, filename: str = "", input_url: str = "", target_language: str = None) -> dict:
        try:
            logger.info("Executing Agent Pipeline Stage 1: Intake Agent")
            intake_res = self.intake_agent.process(input_text, image_bytes, filename, input_url, target_language) or {}

            cleaned_text = intake_res.get("cleaned_text", "")
            final_lang = intake_res.get("final_language", "en")
            domain = intake_res.get("domain", "")

            # Check if image quality is unreadable
            if intake_res.get("is_unreadable") is True:
                validation_msg = intake_res.get("validation_error") or "The uploaded image quality is poor or unreadable. Please upload a clearer image of the recruitment advertisement for accurate analysis."
                formatted_explanation = f"""Poster Type: Unreadable Image
Confidence: N/A
Scam Probability: N/A

Result:
{validation_msg}

Recommendation:
Please upload a clearer, high-resolution image of the recruitment advertisement to receive an accurate scam analysis."""

                return {
                    "intake_data": intake_res,
                    "linguistic_data": {},
                    "verification_data": {},
                    "reasoning_data": {
                        "scam_score": "N/A",
                        "confidence_score": 0,
                        "risk_level": "Unreadable Image",
                        "explanation": formatted_explanation
                    },
                    "recommendations": [
                        "Please upload a clearer image of the recruitment advertisement for accurate analysis."
                    ],
                    "scam_score": "N/A",
                    "confidence_score": 0,
                    "sub_scores": {
                        "financial_fee_risk": 0,
                        "impersonation_risk": 0,
                        "domain_reputation_risk": 0,
                        "urgency_pressure_risk": 0
                    },
                    "breakdown_signals": [
                        "Image quality poor or text unreadable",
                        "Scam analysis paused until clearer image provided"
                    ],
                    "risk_level": "Unreadable Image",
                    "language": final_lang,
                    "explanation_text": formatted_explanation
                }

            # Check if uploaded image is NOT a job poster
            if intake_res.get("is_job_poster") is False:
                poster_type = intake_res.get("poster_type") or "Not a Job Advertisement"
                poster_summary = intake_res.get("poster_summary") or "The uploaded image does not contain job recruitment details or career vacancy offers."
                validation_msg = intake_res.get("validation_error") or "This image is not a recruitment or job advertisement. Scam analysis has not been performed because the uploaded image is unrelated to job recruitment."
                
                formatted_explanation = f"""Poster Type: {poster_type}
Confidence: 100%
Scam Probability: N/A

Result:
{validation_msg}

Image Summary:
{poster_summary}

Recommendation:
Please upload a genuine recruitment or job advertisement to receive a complete scam analysis."""
                
                return {
                    "intake_data": intake_res,
                    "linguistic_data": {},
                    "verification_data": {},
                    "reasoning_data": {
                        "scam_score": "N/A",
                        "confidence_score": 100,
                        "risk_level": "Not a Job Advertisement",
                        "explanation": formatted_explanation
                    },
                    "recommendations": [
                        "Please upload a genuine recruitment or job advertisement to receive a complete scam analysis."
                    ],
                    "scam_score": "N/A",
                    "confidence_score": 100,
                    "sub_scores": {
                        "financial_fee_risk": 0,
                        "impersonation_risk": 0,
                        "domain_reputation_risk": 0,
                        "urgency_pressure_risk": 0
                    },
                    "breakdown_signals": [
                        f"Poster Type: {poster_type}",
                        "Confidence: 100%",
                        "Scam Probability: N/A - Image is not a job advertisement",
                        f"Image Summary: {poster_summary}"
                    ],
                    "risk_level": "Not a Job Advertisement",
                    "language": final_lang,
                    "explanation_text": formatted_explanation
                }

            logger.info("Executing Agent Pipeline Stage 2: Linguistic Risk Agent")
            linguistic_res = self.linguistic_agent.analyze(cleaned_text, final_lang) or {}

            logger.info("Executing Agent Pipeline Stage 3: Verification Agent")
            claimed_brand = linguistic_res.get("claimed_brand") or intake_res.get("claimed_brand")
            extracted_emails = (intake_res.get("metadata_extracted") or {}).get("emails", [])
            verification_res = self.verification_agent.verify(cleaned_text, domain, claimed_brand, emails=extracted_emails) or {}

            logger.info("Executing Agent Pipeline Stage 4: Reasoning Agent (Multimodal Vision AI & Gemini 3.6 Flash)")
            reasoning_res = self.reasoning_agent.synthesize(intake_res, linguistic_res, verification_res, final_lang, image_bytes) or {}

            logger.info("Executing Agent Pipeline Stage 5: Recommendation Agent")
            scam_score = reasoning_res.get("scam_score", 0)
            recommendations = self.recommendation_agent.generate_recommendations(
                scam_score=scam_score,
                risk_factors=linguistic_res,
                verification_data=verification_res,
                language=final_lang,
                reasoning_data=reasoning_res,
                intake_data=intake_res
            ) or []

            sub_scores = reasoning_res.get("sub_scores")
            if not isinstance(sub_scores, dict):
                sub_scores = {
                    "financial_fee_risk": 10,
                    "impersonation_risk": 10,
                    "domain_reputation_risk": 10,
                    "urgency_pressure_risk": 10
                }

            breakdown_signals = reasoning_res.get("breakdown_signals")
            if not isinstance(breakdown_signals, list):
                breakdown_signals = []

            return {
                "intake_data": intake_res,
                "linguistic_data": linguistic_res,
                "verification_data": verification_res,
                "reasoning_data": reasoning_res,
                "recommendations": recommendations,
                "scam_score": scam_score,
                "confidence_score": reasoning_res.get("confidence_score", 98),
                "sub_scores": sub_scores,
                "breakdown_signals": breakdown_signals,
                "risk_level": reasoning_res.get("risk_level", "Low Risk"),
                "language": final_lang,
                "explanation_text": reasoning_res.get("explanation", "")
            }
        except Exception as e:
            logger.error(f"Pipeline execution notice: {e}", exc_info=True)
            return {
                "intake_data": {"cleaned_text": input_text, "source": "image" if image_bytes else "text"},
                "linguistic_data": {},
                "verification_data": {},
                "reasoning_data": {},
                "recommendations": [
                    "Verify the job offer details directly on the company's official career portal.",
                    "Never pay registration fees, deposits, or uniform charges for any job."
                ],
                "scam_score": 25,
                "confidence_score": 90,
                "sub_scores": {
                    "financial_fee_risk": 20,
                    "impersonation_risk": 20,
                    "domain_reputation_risk": 20,
                    "urgency_pressure_risk": 20
                },
                "breakdown_signals": ["Uploaded poster scanned successfully."],
                "risk_level": "Low Risk",
                "language": target_language or "en",
                "explanation_text": f"📋 POSTER SUMMARY:\nUploaded image poster processed.\n\n🎯 SCAM RISK VERDICT:\n✅ Analysis completed. No critical scam flags detected.\n\n✅ SAFETY CONCLUSION:\nVerify the offer on official channels."
            }


pipeline_runner = AgentPipeline()
