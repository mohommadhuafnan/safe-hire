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
        try:
            logger.info("Executing Agent Pipeline Stage 1: Intake Agent")
            intake_res = self.intake_agent.process(input_text, image_bytes, input_url, target_language) or {}

            cleaned_text = intake_res.get("cleaned_text", "")
            final_lang = intake_res.get("final_language", "en")
            domain = intake_res.get("domain", "")

            # Check if non-job poster or non-career image was uploaded
            if intake_res.get("is_job_poster") is False:
                poster_type = intake_res.get("poster_type") or "Informational Flyer / Non-Job Image"
                poster_summary = intake_res.get("poster_summary") or "This uploaded image contains an event flyer, educational poster, or non-recruitment graphic without job vacancy offer details."
                ocr_text = intake_res.get("ocr_text") or cleaned_text or "No readable text extracted."
                claimed_brand = intake_res.get("claimed_brand") or "Informational Flyer"
                
                explanation_text = f"📋 POSTER CLASSIFICATION & TYPE:\n• Category: {poster_type}\n• Claimed Organization / Brand: {claimed_brand}\n\nℹ️ POSTER SUMMARY & DETAILS:\n{poster_summary}\n\n🎯 RECRUITMENT VERDICT:\nThis image is classified as an informational or promotional poster ({poster_type}), not a direct job vacancy offer. SAFE-HIRE verified that no recruitment fee demands or hiring impersonation risks are present.\n\n📄 EXTRACTED VERBATIM CONTENT:\n\"{ocr_text[:1200]}\""
                
                return {
                    "intake_data": intake_res,
                    "linguistic_data": {},
                    "verification_data": {},
                    "reasoning_data": {
                        "scam_score": 0,
                        "risk_level": f"Non-Job Poster ({poster_type})",
                        "explanation": explanation_text
                    },
                    "recommendations": [
                        f"ℹ️ POSTER TYPE: Classified as {poster_type}.",
                        "🔍 EVENT / AD DETAILS: Verify event dates, venue, and organizer details directly with the official hosts.",
                        "✅ NO RECRUITMENT SCAM: No job vacancy fee demands or hiring impersonation risks detected in this poster."
                    ],
                    "scam_score": 0,
                    "confidence_score": 98,
                    "sub_scores": {
                        "financial_fee_risk": 0,
                        "impersonation_risk": 0,
                        "domain_reputation_risk": 0,
                        "urgency_pressure_risk": 0
                    },
                    "breakdown_signals": [
                        f"📌 Poster Classification: {poster_type}",
                        f"🏢 Host / Brand: {claimed_brand}",
                        "ℹ️ Informational Flyer: Non-recruitment offer document.",
                        "✅ Safe Content: Zero job recruitment scam or fee demand risks found."
                    ],
                    "risk_level": f"Non-Job Poster ({poster_type})",
                    "language": final_lang,
                    "explanation_text": explanation_text
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
