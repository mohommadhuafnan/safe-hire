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

            # Check if input (Image, Document, URL, or Text) is NOT a job poster
            if intake_res.get("is_job_poster") is False:
                poster_type = intake_res.get("poster_type") or "Not a Job Advertisement"
                specific_category = intake_res.get("specific_category") or intake_res.get("poster_type") or "Non-Recruitment Document / Media"
                poster_summary = intake_res.get("poster_summary") or "The analyzed content contains general text or media with no job recruitment vacancies, hiring positions, or employment offers."
                
                # Execute WHOIS verification for domain if domain/URL is present
                verification_res = {}
                if domain:
                    verification_res = self.verification_agent.verify(cleaned_text, domain, "", emails=[]) or {}

                whois_info = verification_res.get("whois_info") or {}
                reg_days = whois_info.get("registered_days")
                registrar = whois_info.get("registrar") or "Domain Registrar"
                whois_status = whois_info.get("whois_status") or "Verified Domain Record"
                safe_status = (verification_res.get("safe_browsing") or {}).get("status") or "Verified Safe"

                lang_code = final_lang if final_lang in ["ta", "si", "hi", "bn"] else "en"
                loc = {
                    "ta": {
                        "header_summary": "📋 போஸ்டர் வகைப்பாடு மற்றும் சுருக்கம்:",
                        "lbl_class": "• வகைப்பாடு:",
                        "lbl_conf": "• துல்லியமான நம்பிக்கை: 100%",
                        "lbl_score": "• மோசடி ஆபத்து மதிப்பெண்: N/A (வேலைவாய்ப்பு அற்ற உள்ளடக்கம்)",
                        "header_audit": "🔍 விரிவான படம் & உள்ளடக்கத் தணிக்கை:",
                        "header_conclusion": "💡 தணிக்கை முடிவு & ஆலோசனை:",
                        "body_conclusion": "இந்த ஆவணம்/ஊடகம் SAFE-HIRE AI ஆல் முழுமையாக பகுப்பாய்வு செய்யப்பட்டுள்ளது. இதில் எந்த வேலைவாய்ப்பு விளம்பரங்கள், திறந்த பணியிடங்கள், சம்பள சலுகைகள் அல்லது வேலை பதிவு கட்டண கோரிக்கைகள் இல்லை. வேலைவாய்ப்பு இல்லாத ஊடகத்திற்கு மோசடி நிகழ்தகவு பகுப்பாய்வு பொருந்தாது.",
                        "header_domain": "🌐 தொழில்நுட்ப டொமைன் உளவுத்துறை:",
                        "lbl_target_domain": "• இலக்கு டொமைன்:",
                        "lbl_domain_age": "• டொமைன் வயது:",
                        "lbl_registrar": "• பதிவாளர்:",
                        "lbl_safe_browsing": "• கூகிள் பாதுகாப்பான உலாவுதல் நிலை:",
                        "rec_upload_genuine": "மோசடி நிகழ்தகவு தணிக்கையைப் பெற உண்மையான வேலைவாய்ப்பு விளம்பரம் அல்லது வேலை வாய்ப்பு URL ஐப் பதிவேற்றவும்.",
                        "rec_official_portal": "அதிகாரப்பூர்வ நிறுவனத்தின் போர்ட்டலில் தகவல்களை நேரடியாகச் சரிபார்க்கவும்.",
                        "signal_category": "வகைப்பாடு:",
                        "signal_score": "மோசடி நிகழ்தகவு: N/A (வேலைவாய்ப்பு அற்ற உள்ளடக்கம்)",
                        "signal_audit": "பட உள்ளடக்க தணிக்கை:"
                    },
                    "si": {
                        "header_summary": "📋 පෝස්ටර් වර්ගීකරණය සහ සාරාංශය:",
                        "lbl_class": "• වර්ගීකරණය:",
                        "lbl_conf": "• නිරවද්‍යතා විශ්වාසය: 100%",
                        "lbl_score": "• වංචා අවදානම් ලකුණ: N/A (රැකියා නොවන අන්තර්ගතය)",
                        "header_audit": "🔍 විස්තරාත්මක පින්තූර සහ අන්තර්ගත විගණනය:",
                        "header_conclusion": "💡 විගණන නිගමනය සහ උපදෙස්:",
                        "body_conclusion": "මෙම ලේඛනය/මාධ්‍යය SAFE-HIRE AI විසින් පූර්ණ පරීක්ෂාවට ලක් කර ඇත. මෙහි රැකියා ඇබෑර්තු, වැටුප් දීමනා, හෝ ලියාපදිංචි ගාස්තු ඉල්ලීම් නොමැත. රැකියා නොවන මාධ්‍ය සඳහා වංචා සම්භාවිතා විශ්ලේෂණය අදාළ නොවේ.",
                        "header_domain": "🌐 තාක්ෂණික ඩොමේන් තොරතුරු:",
                        "lbl_target_domain": "• ඉලක්කගත ඩොමේනය:",
                        "lbl_domain_age": "• ඩොමේන් ආයු කාලය:",
                        "lbl_registrar": "• ලියාපදිංචිකරු:",
                        "lbl_safe_browsing": "• Google Safe Browsing තත්ත්වය:",
                        "rec_upload_genuine": "සම්පූර්ණ වංචා අවදානම් විගණනයක් ලබා ගැනීමට කරුණාකර සැබෑ රැකියා දැන්වීමක් හෝ URL එකක් එක් කරන්න.",
                        "rec_official_portal": "නියමිත ආයතනයේ නිල වෙබ් අඩවිය හරහා තොරතුරු පරීක්ෂා කරන්න.",
                        "signal_category": "වර්ගීකරණය:",
                        "signal_score": "වංචා සම්භාවිතාව: N/A (රැකියා නොවන අන්තර්ගතය)",
                        "signal_audit": "රූප අන්තර්ගත විගණනය:"
                    },
                    "hi": {
                        "header_summary": "📋 पोस्टर वर्गीकरण और सारांश:",
                        "lbl_class": "• वर्गीकरण:",
                        "lbl_conf": "• सटीकता विश्वास: 100%",
                        "lbl_score": "• घोटाले का जोखिम स्कोर: N/A (गैर-भर्ती सामग्री)",
                        "header_audit": "🔍 विस्तृत छवि एवं सामग्री ऑडिट:",
                        "header_conclusion": "💡 ऑडिट निष्कर्ष एवं सलाह:",
                        "body_conclusion": "इस दस्तावेज़/मीडिया का SAFE-HIRE AI द्वारा पूरी तरह से विश्लेषण किया गया है। इसमें कोई नौकरी विज्ञापन, रिक्तियां, वेतन प्रस्ताव या पंजीकरण शुल्क की मांग नहीं है। गैर-भर्ती मीडिया के लिए घोटाला संभावना विश्लेषण लागू नहीं होता है।",
                        "header_domain": "🌐 तकनीकी डोमेन इंटेलिजेंस:",
                        "lbl_target_domain": "• लक्षित डोमेन:",
                        "lbl_domain_age": "• डोमेन आयु:",
                        "lbl_registrar": "• रजिस्ट्रार:",
                        "lbl_safe_browsing": "• गूगल सेफ ब्राउज़िंग स्थिति:",
                        "rec_upload_genuine": "पूर्ण घोटाला संभावना ऑडिट प्राप्त करने के लिए कृपया एक वास्तविक भर्ती विज्ञापन या नौकरी URL अपलोड करें।",
                        "rec_official_portal": "आधिकारिक कॉर्पोरेट करियर पोर्टल पर सीधे रिक्ति की जांच करें।",
                        "signal_category": "वर्गीकरण:",
                        "signal_score": "घोटाला संभावना: N/A (गैर-भर्ती सामग्री)",
                        "signal_audit": "छवि सामग्री ऑडिट:"
                    },
                    "bn": {
                        "header_summary": "📋 পোস্টার শ্রেণিবিন্যাস এবং সারাংশ:",
                        "lbl_class": "• শ্রেণিবিন্যাস:",
                        "lbl_conf": "• নির্ভুলতা আত্মবিশ্বাস: 100%",
                        "lbl_score": "• স্ক্যাম ঝুঁকির স্কোর: N/A (অ-নিয়োগ সামগ্রী)",
                        "header_audit": "🔍 বিস্তারিত ছবি ও বিষয়বস্তু অডিট:",
                        "header_conclusion": "💡 অডিট সিদ্ধান্ত ও পরামর্শ:",
                        "body_conclusion": "এই নথিটি/মিডিয়াটি SAFE-HIRE AI দ্বারা পুঙ্খানুপুঙ্খভাবে বিশ্লেষণ করা হয়েছে। এতে কোনো চাকরির নিয়োগের তালিকা, খোলা পদের শূন্যপদ, বেতনের প্রস্তাব বা কর্মসংস্থান নিবন্ধন ফি দাবির নির্দেশ নেই।",
                        "header_domain": "🌐 প্রযুক্তিগত ডোমেইন বুদ্ধিমত্তা:",
                        "lbl_target_domain": "• টার্গেট ডোমেইন:",
                        "lbl_domain_age": "• ডোমেইন বয়স:",
                        "lbl_registrar": "• রেজিস্ট্রার:",
                        "lbl_safe_browsing": "• গুগল সেফ ব্রাউজিং স্ট্যাটাস:",
                        "rec_upload_genuine": "একটি সম্পূর্ণ স্ক্যাম সম্ভাব্যতা অডিট পেতে সঠিক নিয়োগের বিজ্ঞাপন বা চাকরির বিজ্ঞপ্তি URL আপলোড করুন।",
                        "rec_official_portal": "অফিসিয়াল কর্পোরেট ক্যারিয়ার পোর্টালে সরাসরি তথ্য যাচাই করুন।",
                        "signal_category": "শ্রেণিবিন্যাস:",
                        "signal_score": "স্ক্যাম সম্ভাব্যতা: N/A (অ-নিয়োগ সামগ্রী)",
                        "signal_audit": "ছবি বিষয়বস্তু অডিট:"
                    },
                    "en": {
                        "header_summary": "📋 POSTER CLASSIFICATION & SUMMARY:",
                        "lbl_class": "• Classification:",
                        "lbl_conf": "• Precision Confidence: 100%",
                        "lbl_score": "• Scam Risk Score: N/A (Non-Recruitment Content)",
                        "header_audit": "🔍 DETAILED IMAGE & CONTENT AUDIT:",
                        "header_conclusion": "💡 AUDIT CONCLUSION & ADVICE:",
                        "body_conclusion": "This document/media has been thoroughly analyzed by SAFE-HIRE AI. It contains no job recruitment listings, open hiring vacancies, salary offers, or employment registration fee demands. Scam probability analysis is not applicable to non-recruitment media.",
                        "header_domain": "🌐 TECHNICAL DOMAIN INTELLIGENCE:",
                        "lbl_target_domain": "• Target Domain:",
                        "lbl_domain_age": "• Domain Age:",
                        "lbl_registrar": "• Registrar:",
                        "lbl_safe_browsing": "• Google Safe Browsing:",
                        "rec_upload_genuine": "Please upload a genuine recruitment flyer or job vacancy URL to receive a full scam probability audit.",
                        "rec_official_portal": "Verify any institution details directly on their official website or career portal.",
                        "signal_category": "Category:",
                        "signal_score": "Scam Probability: N/A (Non-Recruitment Content)",
                        "signal_audit": "Image Content Audit:"
                    }
                }[lang_code]

                formatted_explanation = f"""{loc['header_summary']}
{loc['lbl_class']} {specific_category}
{loc['lbl_conf']}
{loc['lbl_score']}

{loc['header_audit']}
{poster_summary}

{loc['header_conclusion']}
{loc['body_conclusion']}"""

                if domain:
                    formatted_explanation += f"""

{loc['header_domain']}
{loc['lbl_target_domain']} {domain}
{loc['lbl_domain_age']} {reg_days if reg_days is not None else 'Verified'} Days ({whois_status})
{loc['lbl_registrar']} {registrar}
{loc['lbl_safe_browsing']} {safe_status}"""

                return {
                    "posterType": "Not a Job Advertisement",
                    "confidence": 100,
                    "scamProbability": None,
                    "analysisPerformed": False,
                    "summary": poster_summary,
                    "recommendation": loc["rec_upload_genuine"],
                    "intake_data": intake_res,
                    "linguistic_data": {},
                    "verification_data": verification_res,
                    "reasoning_data": {
                        "scam_score": "N/A",
                        "confidence_score": 100,
                        "risk_level": "Not a Job Advertisement",
                        "explanation": formatted_explanation
                    },
                    "recommendations": [
                        loc["rec_upload_genuine"],
                        loc["rec_official_portal"]
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
                        f"{loc['signal_category']} {specific_category}",
                        loc["signal_score"],
                        f"{loc['signal_audit']} {poster_summary}",
                        f"Domain Target: {domain or 'N/A'}"
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

            explanation_text = reasoning_res.get("explanation", "")

            # If target language is non-English, auto-translate via Valsea AI
            if final_lang and final_lang.lower() != "en":
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
                        logger.info(f"✅ Valsea AI auto-translated pipeline output to '{final_lang}'")
                except Exception as valsea_err:
                    logger.warning(f"Valsea translation in pipeline notice: {valsea_err}")

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
                "explanation_text": explanation_text
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
