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

        logger.info("Executing Agent Pipeline Stage 2: Linguistic Risk Agent")
        linguistic_res = self.linguistic_agent.analyze(cleaned_text, final_lang)

        logger.info("Executing Agent Pipeline Stage 3: Verification Agent")
        claimed_brand = linguistic_res.get("claimed_brand") or intake_res.get("claimed_brand")
        verification_res = self.verification_agent.verify(cleaned_text, domain, claimed_brand)

        logger.info("Executing Agent Pipeline Stage 4: Reasoning Agent (Multimodal Vision AI & Gemini 3.6 Flash)")
        reasoning_res = self.reasoning_agent.synthesize(intake_res, linguistic_res, verification_res, final_lang, image_bytes)

        logger.info("Executing Agent Pipeline Stage 5: Recommendation Agent")
        scam_score = reasoning_res.get("scam_score", 0)
        recommendations = self.recommendation_agent.generate_recommendations(scam_score, linguistic_res, verification_res, final_lang)

        return {
            "intake_data": intake_res,
            "linguistic_data": linguistic_res,
            "verification_data": verification_res,
            "reasoning_data": reasoning_res,
            "recommendations": recommendations,
            "scam_score": scam_score,
            "confidence_score": reasoning_res.get("confidence_score", 98),
            "sub_scores": reasoning_res.get("sub_scores", {}),
            "risk_level": reasoning_res.get("risk_level", "Low Risk"),
            "language": final_lang,
            "explanation_text": reasoning_res.get("explanation", "")
        }

pipeline_runner = AgentPipeline()
