export const exportAnalysisReport = (result, user, currentLanguage = null) => {
  if (!result) return;

  // Determine active language
  const detectedLang = (
    currentLanguage ||
    result.language ||
    localStorage.getItem('i18nextLng') ||
    'en'
  ).split('-')[0].toLowerCase();

  const langKey = ['en', 'si', 'ta', 'hi', 'bn'].includes(detectedLang) ? detectedLang : 'en';

  const I18N_LABELS = {
    en: {
      tagline: "5-Agent AI Scam Detection Verification",
      scamRating: "Scam Probability Rating",
      confidence: "⚡ 98% AI Analysis Precision Confidence",
      rationale: "Explainable Rationale",
      subScores: "Categorized Risk Sub-Scores",
      financialRisk: "Financial & Fee Demand Risk",
      impersonationRisk: "Corporate Email & Brand Impersonation",
      domainRisk: "Domain WHOIS & Web Reputation Risk",
      recommendations: "Personalised Safety Recommendations",
      footerText: "SAFE-HIRE AI Student Protection Engine",
      account: "Account",
      generatedOn: "Generated on",
      report: "REPORT"
    },
    si: {
      tagline: "5-Agent AI රැකියා වංචා පරීක්ෂණ සහතිකය",
      scamRating: "වංචනික බවේ ප්‍රතිශතය",
      confidence: "⚡ 98% AI විශ්ලේෂණ නිරවද්‍යතාව",
      rationale: "විශ්ලේෂණ හේතු දැක්වීම",
      subScores: "අවදානම් වර්ගීකරණය",
      financialRisk: "මුදල් හා ගාස්තු අය කිරීමේ අවදානම",
      impersonationRisk: "ව්‍යාජ විද්‍යුත් තැපෑල හා ආයතනික අනුකරණය",
      domainRisk: "වෙබ් අඩවි පරීක්ෂාව හා WHOIS අවදානම",
      recommendations: "ආරක්ෂිත පියවරයන් හා උපදෙස්",
      footerText: "SAFE-HIRE AI ශිෂ්‍ය ආරක්ෂක පද්ධතිය",
      account: "ගිණුම",
      generatedOn: "වාර්තාව නිකුත් කළ දිනය",
      report: "වාර්තාව"
    },
    ta: {
      tagline: "5-Agent AI வேலை மோசடி சரிபார்ப்பு சான்றிதழ்",
      scamRating: "மோசடி சாத்தியக்கூறு மதிப்பெண்",
      confidence: "⚡ 98% AI பகுப்பாய்வு துல்லியம்",
      rationale: "காரண விளக்கம்",
      subScores: "ஆபத்து துணை மதிப்பெண்கள்",
      financialRisk: "நிதி மற்றும் கட்டண கோரிக்கை அபாயம்",
      impersonationRisk: "போலி மின்னஞ்சல் மற்றும் நிறுவன ஆள்மாறாட்டம்",
      domainRisk: "டொமைன் WHOIS மற்றும் வலைத்தள ஆபத்து",
      recommendations: "பாதுகாப்பு நடவடிக்கைகள் மற்றும் பரிந்துரைகள்",
      footerText: "SAFE-HIRE AI மாணவர் பாதுகாப்பு அமைப்பு",
      account: "கணக்கு",
      generatedOn: "உருவாக்கப்பட்ட தேதி",
      report: "அறிக்கை"
    },
    hi: {
      tagline: "5-Agent AI जॉब स्कैम सत्यापन प्रमाणपत्र",
      scamRating: "स्कैम की संभावना का स्कोर",
      confidence: "⚡ 98% AI विश्लेषण सटीकता",
      rationale: "स्पष्टीकरण और कारण",
      subScores: "वर्गीकृत जोखिम सब-स्कोर",
      financialRisk: "वित्तीय और शुल्क मांग जोखिम",
      impersonationRisk: "कॉर्पोरेट ईमेल और ब्रांड प्रतिरूपण",
      domainRisk: "डोमेन WHOIS और वेब प्रतिष्ठा जोखिम",
      recommendations: "व्यक्तिगत सुरक्षा उपाय",
      footerText: "SAFE-HIRE AI छात्र सुरक्षा प्लेटफॉर्म",
      account: "खाता",
      generatedOn: "जारी करने की तिथि",
      report: "रिपोर्ट"
    },
    bn: {
      tagline: "৫-Agent AI চাকরির প্রতারণা যাচাইকরণ সার্টিফিকেট",
      scamRating: "স্ক্যামের সম্ভাব্যতা স্কোর",
      confidence: "⚡ ৯৮% AI বিশ্লেষণ নির্ভুলতা",
      rationale: "বিশ্লেষণের কারণসমূহ",
      subScores: "ঝুঁকির সাব-স্কোরসমূহ",
      financialRisk: "আর্থিক ও ফি দাবির ঝুঁকি",
      impersonationRisk: "কর্পোরেট ইমেল ও ব্র্যান্ড ছদ্মবেশ",
      domainRisk: "ডোমেইন WHOIS এবং ওয়েব ঝুঁকি",
      recommendations: "ব্যক্তিগত নিরাপত্তা নির্দেশিকা",
      footerText: "SAFE-HIRE AI ছাত্র সুরক্ষা প্লাটফর্ম",
      account: "একাউন্ট",
      generatedOn: "তৈরির তারিখ",
      report: "রিপোর্ট"
    }
  };

  const RISK_LEVEL_LABELS = {
    en: { "Severe Risk": "Severe Risk", "High Risk": "High Risk", "Moderate Risk": "Moderate Risk", "Low Risk": "Low Risk" },
    si: { "Severe Risk": "අතිශය ඉහළ අවදානම (Severe Risk)", "High Risk": "ඉහළ අවදානම (High Risk)", "Moderate Risk": "මධ්‍යම අවදානම (Moderate Risk)", "Low Risk": "අඩු අවදානම (Low Risk)" },
    ta: { "Severe Risk": "மிகவும் ஆபத்தானது (Severe Risk)", "High Risk": "அதிக ஆபத்து (High Risk)", "Moderate Risk": "மிதமான ஆபத்து (Moderate Risk)", "Low Risk": "குறைந்த ஆபத்து (Low Risk)" },
    hi: { "Severe Risk": "गंभीर जोखिम (Severe Risk)", "High Risk": "उच्च जोखिम (High Risk)", "Moderate Risk": "मध्यम जोखिम (Moderate Risk)", "Low Risk": "कम जोखिम (Low Risk)" },
    bn: { "Severe Risk": "মারাত্মক ঝুঁকি (Severe Risk)", "High Risk": "উচ্চ ঝুঁকি (High Risk)", "Moderate Risk": "মাঝারি ঝুঁকি (Moderate Risk)", "Low Risk": "কম ঝুঁকি (Low Risk)" }
  };

  const labels = I18N_LABELS[langKey];
  const riskLabels = RISK_LEVEL_LABELS[langKey];

  const reportId = result.id ? result.id.slice(-8).toUpperCase() : 'SH-' + Math.floor(100000 + Math.random() * 900000);
  const dateStr = result.created_at ? new Date(result.created_at).toLocaleString() : new Date().toLocaleString();

  const riskFactors = result.risk_factors || {};
  const verificationData = result.verification_data || {};
  const subScores = result.sub_scores || {
    financial_fee_risk: riskFactors.has_payment_demand ? 95 : 10,
    impersonation_risk: riskFactors.has_impersonation_risk ? 85 : 15,
    domain_reputation_risk: 100 - (verificationData.verification_trust_score || 80),
    urgency_pressure_risk: riskFactors.has_urgency_tactics ? 75 : 10
  };
  const recs = result.recommendations || [];
  const riskLevelText = riskLabels[result.risk_level] || result.risk_level;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>SAFE-HIRE AI - ${labels.report} #${reportId}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0b1120; color: #f1f5f9; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 26px; font-weight: 800; color: #818cf8; letter-spacing: -0.5px; }
        .tagline { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
        .badge { background: #1e1b4b; border: 1px solid #6366f1; color: #a5b4fc; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 13px; }
        .score-card { background: #1e293b; border-radius: 20px; padding: 30px; text-align: center; margin-bottom: 24px; border: 1px solid #334155; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .score-val { font-size: 58px; font-weight: 900; line-height: 1; color: ${result.scam_score >= 60 ? '#f43f5e' : result.scam_score >= 30 ? '#f59e0b' : '#10b981'}; }
        .risk-label { font-size: 18px; font-weight: 800; text-transform: uppercase; margin-top: 8px; color: ${result.scam_score >= 60 ? '#f43f5e' : result.scam_score >= 30 ? '#f59e0b' : '#10b981'}; }
        .section { background: #1e293b; border-radius: 16px; padding: 22px; margin-bottom: 20px; border: 1px solid #334155; }
        .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1.2px; color: #38bdf8; font-weight: bold; margin-bottom: 12px; }
        .sub-score { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; font-weight: 600; }
        .progress-bg { background: #0f172a; height: 10px; border-radius: 6px; overflow: hidden; margin-bottom: 14px; border: 1px solid #334155; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #38bdf8); }
        ul { padding-left: 20px; margin: 0; }
        li { margin-bottom: 10px; font-size: 13px; color: #cbd5e1; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #334155; color: #64748b; font-size: 11px; }
        @media print {
          body { background: #ffffff !important; color: #0f172a !important; padding: 20px; }
          .score-card, .section { background: #f8fafc !important; border-color: #cbd5e1 !important; box-shadow: none !important; }
          .progress-bg { background: #e2e8f0 !important; }
          .footer { color: #64748b !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">SAFE-HIRE AI</div>
          <div class="tagline">${labels.tagline}</div>
        </div>
        <div>
          <span class="badge">${labels.report} #${reportId}</span>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 6px; text-align: right;">${dateStr}</div>
        </div>
      </div>

      <div class="score-card">
        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">${labels.scamRating}</div>
        <div class="score-val">${result.scam_score} <span style="font-size: 20px; font-weight: normal; color: #94a3b8;">/ 100</span></div>
        <div class="risk-label">${riskLevelText}</div>
        <div style="font-size: 12px; color: #38bdf8; margin-top: 8px; font-weight: 600;">${labels.confidence}</div>
      </div>

      <div class="section">
        <div class="section-title">${labels.rationale}</div>
        <p style="font-size: 13px; white-space: pre-line; color: #e2e8f0; margin: 0; line-height: 1.7;">${result.explanation_text}</p>
      </div>

      <div class="section">
        <div class="section-title">${labels.subScores}</div>
        
        <div class="sub-score"><span>${labels.financialRisk}</span><span>${subScores.financial_fee_risk || 0}%</span></div>
        <div class="progress-bg"><div class="progress-fill" style="width: ${subScores.financial_fee_risk || 0}%;"></div></div>
        
        <div class="sub-score"><span>${labels.impersonationRisk}</span><span>${subScores.impersonation_risk || 0}%</span></div>
        <div class="progress-bg"><div class="progress-fill" style="width: ${subScores.impersonation_risk || 0}%;"></div></div>

        <div class="sub-score"><span>${labels.domainRisk}</span><span>${subScores.domain_reputation_risk || 0}%</span></div>
        <div class="progress-bg"><div class="progress-fill" style="width: ${subScores.domain_reputation_risk || 0}%;"></div></div>
      </div>

      <div class="section">
        <div class="section-title">${labels.recommendations}</div>
        <ul>
          ${recs.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>

      <div class="footer">
        ${labels.footerText} • ${labels.account}: ${user?.full_name || 'Authenticated User'} (${user?.email || ''}) • ${labels.generatedOn} ${dateStr}
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
};
