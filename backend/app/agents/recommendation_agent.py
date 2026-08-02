import logging
from typing import List

logger = logging.getLogger("safe_hire.recommendation_agent")

class RecommendationAgent:
    """Agent 5: Generates personalized safety advice & university reporting guidance."""

    RECOMMENDATIONS = {
        "en": [
            "DO NOT SEND MONEY: Legitimate employers never charge candidates for job application fees, laptop equipment deposits, or interview processing.",
            "VERIFY ON LINKEDIN: Look up the recruiter's full name and current employer on LinkedIn. Ensure their official email domain matches the company (e.g., @company.com).",
            "CHECK OFFICIAL CAREERS PAGE: Search for the job title directly on the official company careers portal rather than third-party messaging links.",
            "NEVER SHARE SENSITIVE DATA: Do not send copies of your National Identity Card (NIC), Passport, or Bank Account numbers via WhatsApp or Telegram.",
            "REPORT SUSPICIOUS OFFERS: Inform your University Career Guidance Unit or lodge a complaint with national cyber crime reporting portals."
        ],
        "si": [
            "මුදල් ගෙවන්න එපා: නීත්‍යානුකූල ආයතන කිසිවිටෙකත් අයදුම්පත් ගාස්තු, ලැප්ටොප් තැන්පතු හෝ සම්මුඛ පරීක්ෂණ ගාස්තු අය නොකරයි.",
            "LINKEDIN හරහා තහවුරු කරන්න: බඳවාගන්නා තැනැත්තාගේ නම සහ ආයතනය LinkedIn හි පරීක්ෂා කර බලන්න.",
            "නිල වෙබ් අඩවිය පරීක්ෂා කරන්න: අදාළ රැකියා ඇබෑර්තුව ආයතනයේ නිල වෙබ් අඩවියෙහි පවතීදැයි පරීක්ෂා කරන්න.",
            "සංවේදී තොරතුරු ලබා නොදෙන්න: ඔබගේ ජාතික හැඳුනුම්පත් අංකය හෝ බැංකු තොරතුරු වට්ස්ඇප් හරහා යැවීමෙන් වළකින්න.",
            "විශ්වවිද්‍යාලයට හෝ පොලිසියට දැනුම් දෙන්න: සැකකටයුතු රැකියා යෝජනා පිළිබඳ විශ්වවිද්‍යාල වෘත්තීය මාර්ගෝපදේශන අංශයට දැනුම් දෙන්න."
        ],
        "ta": [
            "பணம் அனுப்ப வேண்டாம்: முறையான நிறுவனங்கள் ஒருபோதும் விண்ணப்பக் கட்டணம் அல்லது மடிக்கணினி முன்பணம் கேட்பதில்லை.",
            "LINKEDIN மூலம் சரிபார்க்கவும்: வேலை வழங்குபவரின் சுயவிவரத்தை LinkedIn இல் சரிபார்க்கவும்.",
            "அதிகாரப்பூர்வ வலைத்தளத்தைப் பார்க்கவும்: நிறுவனத்தின் அதிகாரப்பூர்வ ஆட்சேர்ப்பு பக்கத்தில் வேலையைத் தேடுங்கள்.",
            "ரகசிய தகவல்களைப் பகிர வேண்டாம்: உங்கள் அடையாள அட்டை அல்லது வங்கி விவரங்களை வாட்ஸ்அப்பில் அனுப்ப வேண்டாம்.",
            "பல்கலைக்கழகத்திற்கு அறிவிக்கவும்: சந்தேகத்திற்குரிய சலுகைகள் குறித்து உங்கள் பல்கலைக்கழக தொழில் வழிகாட்டுதல் பிரிவிடம் தெரிவிக்கவும்."
        ],
        "hi": [
            "पैसे न भेजें: वैध कंपनियां कभी भी नौकरी आवेदन, लैपटॉप डिपॉजिट या इंटरव्यू फीस नहीं मांगती हैं।",
            "LINKEDIN पर जांचें: भर्तीकर्ता का नाम और कंपनी प्रोफ़ाइल LinkedIn पर सत्यापित करें।",
            "आधिकारिक करियर पेज देखें: कंपनी के आधिकारिक करियर पोर्टल पर सीधे रिक्ति की जांच करें।",
            "संवेदनशील डेटा साझा न करें: व्हाट्सएप या टेलीग्राम के माध्यम से अपना आधार, पैन या बैंक विवरण न भेजें।",
            "विश्वविद्यालय में रिपोर्ट करें: अपने विश्वविद्यालय कैरियर मार्गदर्शन इकाई या राष्ट्रीय साइबर अपराध पोर्टल पर रिपोर्ट करें।"
        ],
        "bn": [
            "টাকা পাঠাবেন না: বৈধ কোম্পানিগুলো কখনোই চাকরির আবেদন ফি বা ল্যাপটপ জামানত দাবি করে না।",
            "LINKEDIN-এ যাচাই করুন: রিক্রুটারের নাম এবং বর্তমান কোম্পানি লিঙ্কডইনে সার্চ করে যাচাই করুন।",
            "অফিসিয়াল ক্যারিয়ার পেজ চেক করুন: সরাসরি কোম্পানির অফিসিয়াল ক্যারিয়ার পোর্টালে সার্কুলারটি খুঁজুন।",
            "সংবেদনশীল তথ্য শেয়ার করবেন না: হোয়াটসঅ্যাপ বা টেলিগ্রামে আপনার জাতীয় পরিচয়পত্র বা ব্যাংক বিবরণ পাঠাবেন না।",
            "বিশ্ববিদ্যালয়ে রিপোর্ট করুন: আপনার বিশ্ববিদ্যালয়ের ক্যারিয়ার গাইডেন্স বিভাগ বা সাইবার ক্রাইম পোর্টালে অভিযোগ জানান।"
        ]
    }

    def generate_recommendations(self, scam_score: int, risk_factors: dict, verification_data: dict, language: str = "en") -> List[str]:
        lang_key = language if language in self.RECOMMENDATIONS else "en"
        base_recs = list(self.RECOMMENDATIONS[lang_key])

        # Add custom dynamic recommendation if specific risk detected
        if risk_factors.get("has_payment_demand"):
            if lang_key == "si":
                base_recs.insert(0, "⚠️ හදිසි නියෝගය: මෙම යෝජනාව මුදල් අය කිරීමක් අඩංගු බැවින් වහාම ප්‍රතික්ෂේප කරන්න!")
            elif lang_key == "ta":
                base_recs.insert(0, "⚠️ அவசர எச்சரிக்கை: இந்த சலுகை பணம் கேட்பதால் உடனடியாக நிராகரிக்கவும்!")
            elif lang_key == "hi":
                base_recs.insert(0, "⚠️ तत्काल चेतावनी: यह प्रस्ताव पैसे की मांग करता है, इसे तुरंत अस्वीकार करें!")
            elif lang_key == "bn":
                base_recs.insert(0, "⚠️ জরুরী সতর্কতা: এই প্রস্তাবটি টাকা দাবি করে, অবিলম্বে প্রত্যাখ্যান করুন!")
            else:
                base_recs.insert(0, "⚠️ CRITICAL WARNING: Reject this offer immediately as it involves advance payment demands!")

        return base_recs
