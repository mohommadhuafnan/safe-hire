import logging
from typing import List

logger = logging.getLogger("safe_hire.recommendation_agent")

class RecommendationAgent:
    """Agent 5: Generates personalized, context-aware safety advice & university reporting guidance."""

    BASE_RECOMMENDATIONS = {
        "en": [
            "DO NOT SEND MONEY: Legitimate employers never charge candidates for job application fees, laptop equipment deposits, uniform fees, interview processing charges, or any form of advance payment — even if claimed 'refundable'.",
            "VERIFY ON LINKEDIN: Look up the recruiter's full name and current employer on LinkedIn. Ensure their official email domain matches the company (e.g., hr@company.com, NOT @gmail.com).",
            "CHECK OFFICIAL CAREERS PAGE: Search for the job title directly on the company's official careers portal (e.g., company.com/careers) rather than trusting third-party messaging links or screenshots.",
            "NEVER SHARE SENSITIVE DATA: Do not send copies of your National Identity Card (NIC), Passport, or Bank Account numbers via WhatsApp, Telegram, or any messaging app to unverified recruiters.",
            "REPORT SUSPICIOUS OFFERS: Inform your University Career Guidance Unit or lodge a formal complaint with national cyber crime reporting portals (e.g., cybercrime.gov.lk, cybercrime.gov.in).",
            "CROSS-CHECK DOMAIN EMAIL: Genuine companies use professional domain emails (hr@company.com). An offer from @gmail.com or @yahoo.com claiming to be from Google, Amazon, or Virtusa is almost certainly fraudulent.",
            "TRUST YOUR INSTINCTS: If an offer sounds too good to be true — unusually high salary, no interview, immediate joining — it almost certainly is a scam. Always apply cautious verification before taking any action."
        ],
        "si": [
            "මුදල් ගෙවන්න එපා: නීත්‍යානුකූල ආයතන කිසිවිටෙකත් ලියාපදිංචි ගාස්තු, ලැප්ටොප් තැන්පතු, ඇඳුම් ගාස්තු හෝ ඕනෑම ආකාරයක ප්‍රත්‍යාවර්ත ගාස්තු අය නොකරයි.",
            "LINKEDIN හරහා තහවුරු කරන්න: බඳවාගන්නා තැනැත්තාගේ නම, ආයතනය සහ ඔවුන්ගේ ඊමේල් ලිපිනය LinkedIn හි පරීක්ෂා කර බලන්න.",
            "නිල ආයතනික වෙබ් අඩවිය පරීක්ෂා කරන්න: සිදු කරනු ලබන රැකියා ඇබෑර්තුව ආයතනයේ නිල වෙබ් අඩවිය (company.com/careers) හි ද ලැයිස්තුගත කර ඇත්ද යන්න සත්‍යාපනය කරන්න.",
            "සංවේදී තොරතුරු ලබා නොදෙන්න: ජාතික හැඳුනුම්පත් අංකය, ගිණුම් විස්තර, හෝ ගමන් බලපත්‍ර තොරතුරු WhatsApp/Telegram හරහා නොදෙන්න.",
            "විශ්ව විද්‍යාලයට හෝ පොලිසියට දැනුම් දෙන්න: ජාතික සයිබර් අපරාධ රිපෝටු කිරීමේ ද්වාරය (cybercrime.gov.lk) හරහා වාර්තා කරන්න.",
            "නිල විද්‍යුත් තැපැල් ලිපිනය සත්‍යාපනය කරන්න: @gmail.com, @yahoo.com ලිපිනයකින් ආ ව‍ෘත්තීය ඉල්ලීම් ළඟ ළං නොවන්න — නිල ආයතන hr@company.com ලිපිනය ‍‍ආකාරයේ ලිපිනයන් භාවිත කරයි.",
            "ඔබේ අවස්ථාව ගැන ජ‍ාගරූකව සිතන්න: ඉහළ ‍‍ආදායම, සම්මුඛ පරීක්ෂණයකින් ‍‍තොරව, ‍‍ව‍ෘත්තීය සුදුසුකම් ‍‍නොමැතිව — මෙය ‍‍ව‍ංචාවක් ‍‍ලකුණ විය හැකිය."
        ],
        "ta": [
            "பணம் அனுப்ப வேண்டாம்: முறையான நிறுவனங்கள் ஒருபோதும் விண்ணப்பக் கட்டணம், மடிக்கணினி முன்பணம், யூனிஃபார்ம் கட்டணம் அல்லது எந்த வகையான முன்பணமும் கேட்பதில்லை.",
            "LINKEDIN மூலம் சரிபார்க்கவும்: வேலை வழங்குபவரின் பெயர், நிறுவனம், மின்னஞ்சல் ஆகியவற்றை LinkedIn இல் சரிபார்க்கவும்.",
            "அதிகாரப்பூர்வ வலைத்தளத்தைப் பார்க்கவும்: நிறுவனத்தின் official careers page இல் (company.com/careers) இந்த வேலையை தேடுங்கள்.",
            "ரகசிய தகவல்களை பகிர வேண்டாம்: ஆதார், கடவுச்சீட்டு, வங்கி விவரங்களை WhatsApp அல்லது Telegram வழியாக அனுப்ப வேண்டாம்.",
            "புகார் அளிக்கவும்: cybercrime.gov.in அல்லது உங்கள் கல்லூரி career guidance unit-க்கு தெரிவிக்கவும்.",
            "மின்னஞ்சல் டொமைனை சரிபார்க்கவும்: @gmail.com அல்லது @yahoo.com இலிருந்து வரும் நிறுவன வேலை வாய்ப்புகள் ஏமாற்றுவதாக இருக்கலாம். உண்மையான நிறுவனங்கள் hr@company.com பயன்படுத்துகின்றன.",
            "உங்கள் சாதகமான புத்தியை நம்புங்கள்: நேர்காணல் இல்லாத, அதிகமான சம்பளம் கூறும் வேலை வாய்ப்புகளை கவனமாக சரிபார்க்கவும்."
        ],
        "hi": [
            "पैसे न भेजें: वैध कंपनियां कभी भी नौकरी आवेदन शुल्क, लैपटॉप डिपॉजिट, यूनिफॉर्म चार्ज या किसी भी प्रकार का अग्रिम भुगतान नहीं मांगतीं।",
            "LINKEDIN पर जांचें: रिक्रूटर का नाम, कंपनी प्रोफ़ाइल और ऑफिशियल ईमेल डोमेन LinkedIn पर सत्यापित करें।",
            "आधिकारिक करियर पेज देखें: कंपनी के आधिकारिक करियर पोर्टल (company.com/careers) पर इस नौकरी को खोजें।",
            "संवेदनशील डेटा साझा न करें: आधार, पैन, पासपोर्ट या बैंक विवरण WhatsApp या Telegram पर न भेजें।",
            "साइबर अपराध की रिपोर्ट करें: cybercrime.gov.in पर ऑनलाइन शिकायत दर्ज करें या अपने विश्वविद्यालय कैरियर सेल को सूचित करें।",
            "ईमेल डोमेन जांचें: @gmail.com या @yahoo.com से आने वाले कॉर्पोरेट नौकरी के प्रस्ताव लगभग हमेशा फर्जी होते हैं। असली कंपनियां hr@company.com जैसे डोमेन ईमेल का उपयोग करती हैं।",
            "अपनी सहज बुद्धि पर भरोसा करें: बिना इंटरव्यू के, बेहद ऊंची सैलरी वाली, अत्यधिक आसान नौकरियां अक्सर धोखाधड़ी के संकेत हैं।"
        ],
        "bn": [
            "টাকা পাঠাবেন না: বৈধ কোম্পানিগুলো কখনোই চাকরির আবেদন ফি, ল্যাপটপ জামানত, ইউনিফর্ম চার্জ বা কোনো ধরনের অগ্রিম অর্থ দাবি করে না।",
            "LINKEDIN-এ যাচাই করুন: রিক্রুটারের নাম, বর্তমান কোম্পানি এবং ইমেইল ডোমেইন লিঙ্কডইনে সার্চ করে যাচাই করুন।",
            "অফিসিয়াল ক্যারিয়ার পেজ চেক করুন: সরাসরি কোম্পানির অফিসিয়াল ক্যারিয়ার পোর্টালে (company.com/careers) সার্কুলারটি খুঁজুন।",
            "সংবেদনশীল তথ্য শেয়ার করবেন না: NID, পাসপোর্ট বা ব্যাংক বিবরণ হোয়াটসঅ্যাপ বা টেলিগ্রামে পাঠাবেন না।",
            "সাইবার ক্রাইম পোর্টালে রিপোর্ট করুন: জাতীয় সাইবার ক্রাইম পোর্টাল বা বিশ্ববিদ্যালয়ের ক্যারিয়ার গাইডেন্স বিভাগকে জানান।",
            "ইমেইল ডোমেইন যাচাই করুন: @gmail.com বা @yahoo.com থেকে আসা কর্পোরেট চাকরির অফার প্রায়ই জাল হয়। আসল কোম্পানি hr@company.com ধরনের ডোমেইন ইমেইল ব্যবহার করে।",
            "আপনার প্রবৃত্তিকে বিশ্বাস করুন: ইন্টারভিউ ছাড়া, অস্বাভাবিক বেশি বেতনের, অতি সহজ কাজের অফার প্রায়ই প্রতারণার ইঙ্গিত দেয়।"
        ]
    }

    CRITICAL_FEE_DEMAND_ALERT = {
        "en": "🚨 CRITICAL WARNING: This offer contains advance PAYMENT DEMANDS — Reject this offer IMMEDIATELY. Never send money to a recruiter under any circumstances!",
        "si": "🚨 CRITICAL WARNING: මෙම ඉල්ලීම ලියාපදිංචි ගාස්තු හෝ මුදල් ගෙවීමේ ඉල්ලීම් ඇතුළත් ය — වහාම ප්‍රතික්ෂේප කරන්න!",
        "ta": "🚨 CRITICAL WARNING: இந்த சலுகை கட்டண கோரிக்கைகளை உள்ளடக்கியது — உடனே நிராகரிக்கவும்!",
        "hi": "🚨 CRITICAL WARNING: इस प्रस्ताव में भुगतान की मांग है — इसे तुरंत अस्वीकार करें!",
        "bn": "🚨 CRITICAL WARNING: এই প্রস্তাবে অর্থ প্রদানের দাবি রয়েছে — অবিলম্বে প্রত্যাখ্যান করুন!"
    }

    IMPERSONATION_ALERT = {
        "en": "⚠️ IMPERSONATION RISK: This offer appears to impersonate a well-known brand using a free email (e.g. @gmail.com). Verify the sender's domain against the company's official website before responding.",
        "si": "⚠️ IMPERSONATION RISK: මෙම දැන්වීම ප්‍රසිද්ධ ආයතනයක නාමය @gmail.com වැනි නිදහස් ඊමේල් ලිපිනයකින් භාවිත කළේ ය. නිල ආයතනික වෙබ් අඩවිය හරහා සත්‍යාපනය කරන්න.",
        "ta": "⚠️ IMPERSONATION RISK: இந்த சலுகை @gmail.com போன்ற இலவச மின்னஞ்சல் பயன்படுத்தி பிரபல நிறுவனத்தை ஆள்மாறாட்டம் செய்கிறது. official website மூலம் சரிபார்க்கவும்.",
        "hi": "⚠️ IMPERSONATION RISK: यह प्रस्ताव @gmail.com जैसे फ्री ईमेल से किसी प्रसिद्ध ब्रांड का ढोंग करता प्रतीत होता है। आधिकारिक वेबसाइट से सत्यापित करें।",
        "bn": "⚠️ IMPERSONATION RISK: এই অফারটি @gmail.com এর মতো ফ্রি ইমেইল ব্যবহার করে একটি পরিচিত ব্র্যান্ড ছদ্মবেশ ধারণ করেছে। অফিসিয়াল ওয়েবসাইটে যাচাই করুন।"
    }

    TELEGRAM_ALERT = {
        "en": "📵 TELEGRAM/WHATSAPP-ONLY ALERT: This recruitment offer directs candidates only to informal messaging channels (Telegram/WhatsApp). Legitimate employers always provide official corporate email or website contact.",
        "si": "📵 TELEGRAM/WHATSAPP ALERT: මෙම ඉල්ලීම Telegram/WhatsApp හරහා පමණක් ‍‍සම්බ‍ධ ‍‍ව‍ීමට ‍‍ඉල්ලා ‍‍ස‍ිට‍ිය‍ නීත්‍යානුකූල ‍‍ආය‍ත‍න ‍‍නිල ‍‍ඊම‍‍ේල් ‍‍ල‍‍ිපිනය‍ ‍‍ල‍‍ෙස‍ ‍‍‍ස‍‍ං‍‍‍‍‍‍‍‍ව‍‍ේ‍‍‍‍‍.",
        "ta": "📵 TELEGRAM/WHATSAPP ALERT: இந்த சலுகை Telegram/WhatsApp மட்டுமே பயன்படுத்துகிறது. உண்மையான நிறுவனங்கள் எப்போதும் official email அல்லது website வழியாக தொடர்பு கொள்கின்றன.",
        "hi": "📵 TELEGRAM/WHATSAPP ALERT: यह प्रस्ताव केवल Telegram/WhatsApp के माध्यम से संपर्क करने के लिए कह रहा है। असली कंपनियां हमेशा ऑफिशियल ईमेल या वेबसाइट प्रदान करती हैं।",
        "bn": "📵 TELEGRAM/WHATSAPP ALERT: এই অফারটি শুধুমাত্র Telegram/WhatsApp-এ যোগাযোগ করতে বলছে। বৈধ নিয়োগকর্তারা সর্বদা অফিসিয়াল ইমেইল বা ওয়েবসাইট প্রদান করেন।"
    }

    def generate_recommendations(self, scam_score: int, risk_factors: dict, verification_data: dict, language: str = "en") -> List[str]:
        lang_key = language if language in self.BASE_RECOMMENDATIONS else "en"
        recs = list(self.BASE_RECOMMENDATIONS[lang_key])

        # Prepend critical dynamic alerts based on detected risk signals
        if risk_factors.get("has_payment_demand"):
            recs.insert(0, self.CRITICAL_FEE_DEMAND_ALERT.get(lang_key, self.CRITICAL_FEE_DEMAND_ALERT["en"]))

        if risk_factors.get("has_impersonation_risk"):
            recs.insert(1 if risk_factors.get("has_payment_demand") else 0,
                        self.IMPERSONATION_ALERT.get(lang_key, self.IMPERSONATION_ALERT["en"]))

        if risk_factors.get("has_suspicious_channels"):
            recs.insert(0 if not risk_factors.get("has_payment_demand") else 2,
                        self.TELEGRAM_ALERT.get(lang_key, self.TELEGRAM_ALERT["en"]))

        # Add new domain risk alert
        if verification_data.get("whois_info", {}).get("is_new_domain"):
            domain = verification_data.get("domain", "this domain")
            new_domain_alert = {
                "en": f"🌐 NEW DOMAIN RISK: The domain '{domain}' was registered less than 90 days ago. Scam operations frequently use newly registered domains to impersonate legitimate companies. Do NOT proceed.",
                "si": f"🌐 නව ඩොමේන් අවදානම: '{domain}' ඩොමේනය දින 90කට වඩා අඩු කාලයකට ලියාපදිංචි කර ඇත. ව‍ංචනිකයන් නව ඩොමේන් භාවිත කරයි. ඉදිරියට නොයන්න.",
                "ta": f"🌐 புதிய டொமைன் ஆபத்து: '{domain}' டொமைன் 90 நாட்களுக்குள் பதிவு செய்யப்பட்டது. மோசடி நடவடிக்கைகள் புதிதாக பதிவு செய்யப்பட்ட டொமைன்களை பயன்படுத்துகின்றன.",
                "hi": f"🌐 नए डोमेन का जोखिम: '{domain}' डोमेन 90 दिनों से कम पहले पंजीकृत किया गया था। घोटालेबाज अक्सर नए डोमेन का उपयोग करते हैं। आगे मत बढ़ें।",
                "bn": f"🌐 নতুন ডোমেইন ঝুঁকি: '{domain}' ডোমেইনটি ৯০ দিনের মধ্যে নিবন্ধিত হয়েছে। স্ক্যামাররা প্রায়ই নতুন ডোমেইন ব্যবহার করে। এগিয়ে যাবেন না।"
            }
            recs.insert(0, new_domain_alert.get(lang_key, new_domain_alert["en"]))

        return recs
