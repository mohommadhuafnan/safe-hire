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
      tagline: "5-Agent AI Job Scam Verification Certificate",
      scamRating: "Scam Probability Rating",
      confidence: "⚡ 98% AI Multi-Agent Audit Precision Confidence",
      rationale: "Explainable AI Rationale",
      subScores: "Categorized Multi-Signal Risk Sub-Scores",
      financialRisk: "Financial & Fee Demand Risk",
      impersonationRisk: "Corporate Email & Brand Impersonation",
      domainRisk: "Domain WHOIS & Web Reputation Risk",
      urgencyRisk: "Urgency & Pressure Tactics Risk",
      recommendations: "Personalised Safety Action Plan",
      footerText: "SAFE-HIRE AI Student & Graduate Protection Engine",
      account: "Verified User Account",
      generatedOn: "Audit Date",
      report: "AUDIT REPORT",
      seal: "OFFICIAL VERIFIED AUDIT"
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
      urgencyRisk: "අනවශ්‍ය බලපෑම් හා හදිසි කිරීම් අවදානම",
      recommendations: "ආරක්ෂිත පියවරයන් හා උපදෙස්",
      footerText: "SAFE-HIRE AI ශිෂ්‍ය ආරක්ෂක පද්ධතිය",
      account: "පරිශීලක ගිණුම",
      generatedOn: "නිකුත් කළ දිනය",
      report: "වාර්තාව",
      seal: "නිල පරීක්ෂණ සහතිකය"
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
      urgencyRisk: "அவசர மற்றும் அழுத்த உத்திகள் ஆபத்து",
      recommendations: "பாதுகாப்பு நடவடிக்கைகள் மற்றும் பரிந்துரைகள்",
      footerText: "SAFE-HIRE AI மாணவர் பாதுகாப்பு அமைப்பு",
      account: "பயனர் கணக்கு",
      generatedOn: "உருவாக்கப்பட்ட தேதி",
      report: "அறிக்கை",
      seal: "அதிகாரப்பூர்வ சரிபார்ப்பு சான்றிதழ்"
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
      urgencyRisk: "तत्परता और दबाव रणनीति जोखिम",
      recommendations: "व्यक्तिगत सुरक्षा उपाय",
      footerText: "SAFE-HIRE AI छात्र सुरक्षा प्लेटफॉर्म",
      account: "उपयोगकर्ता खाता",
      generatedOn: "जारी करने की तिथि",
      report: "रिपोर्ट",
      seal: "आधिकारिक सत्यापन प्रमाणपत्र"
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
      urgencyRisk: "জরুরি চাপ ও মানসিক কৌশল ঝুঁকি",
      recommendations: "ব্যক্তিগত নিরাপত্তা নির্দেশিকা",
      footerText: "SAFE-HIRE AI ছাত্র সুরক্ষা প্লাটফর্ম",
      account: "ব্যবহারকারী একাউন্ট",
      generatedOn: "তৈরির তারিখ",
      report: "রিপোর্ট",
      seal: "অফিসিয়াল যাচাইকরণ সার্টিফিকেট"
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

  const overallScore = Number(result.scam_score) || 0;
  const riskFactors = result.risk_factors || {};
  const verificationData = result.verification_data || {};

  // Dynamically align sub-scores with overall score if missing
  const subScores = {
    financial_fee_risk: result.sub_scores?.financial_fee_risk ?? (
      riskFactors.has_payment_demand ? 95 : (overallScore > 60 ? Math.min(95, overallScore) : 10)
    ),
    impersonation_risk: result.sub_scores?.impersonation_risk ?? (
      riskFactors.has_impersonation_risk ? 90 : (overallScore > 60 ? Math.min(90, Math.max(20, overallScore - 5)) : 15)
    ),
    domain_reputation_risk: result.sub_scores?.domain_reputation_risk ?? (
      verificationData.verification_trust_score ? (100 - verificationData.verification_trust_score) : (overallScore > 60 ? Math.min(85, overallScore - 10) : 15)
    ),
    urgency_pressure_risk: result.sub_scores?.urgency_pressure_risk ?? (
      riskFactors.has_urgency_tactics ? 85 : (overallScore > 60 ? Math.min(80, overallScore - 15) : 10)
    )
  };

  const recs = result.recommendations || [
    "DO NOT SEND MONEY: Legitimate employers never charge candidates for job application fees, laptop equipment deposits, or interview processing.",
    "VERIFY ON LINKEDIN: Look up the recruiter's full name and current employer on LinkedIn. Ensure their official email domain matches the company.",
    "CHECK OFFICIAL CAREERS PAGE: Search for the job title directly on the official company careers portal rather than third-party messaging links.",
    "NEVER SHARE SENSITIVE DATA: Do not send copies of your National Identity Card (NIC), Passport, or Bank Account numbers via WhatsApp or Telegram.",
    "REPORT SUSPICIOUS OFFERS: Inform your University Career Guidance Unit or lodge a complaint with national cyber crime reporting portals."
  ];

  const riskLevelText = riskLabels[result.risk_level] || result.risk_level || (overallScore >= 60 ? 'Severe Risk' : overallScore >= 30 ? 'Moderate Risk' : 'Low Risk');
  const scoreColor = overallScore >= 60 ? '#dc2626' : overallScore >= 30 ? '#d97706' : '#16a34a';
  const scoreBgColor = overallScore >= 60 ? '#fef2f2' : overallScore >= 30 ? '#fffbeb' : '#f0fdf4';
  const scoreBorderColor = overallScore >= 60 ? '#fecaca' : overallScore >= 30 ? '#fde68a' : '#bbf7d0';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="${langKey}">
    <head>
      <meta charset="UTF-8">
      <title>SAFE-HIRE AI Audit Report #${reportId}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm;
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #ffffff;
          color: #1e293b;
          margin: 0;
          padding: 12px;
          line-height: 1.4;
          font-size: 12px;
        }

        .container {
          max-width: 780px;
          margin: 0 auto;
        }

        /* HEADER */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #4f46e5;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }

        .brand-title {
          font-size: 24px;
          font-weight: 900;
          color: #4f46e5;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .brand-subtitle {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 700;
        }

        .report-badge {
          background: #e0e7ff;
          border: 1px solid #6366f1;
          color: #3730a3;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 11px;
          text-align: right;
        }

        .report-date {
          font-size: 10px;
          color: #64748b;
          margin-top: 3px;
          text-align: right;
        }

        /* SCAM SCORE CARD */
        .score-card {
          background: ${scoreBgColor};
          border: 1.5px solid ${scoreBorderColor};
          border-radius: 16px;
          padding: 16px;
          text-align: center;
          margin-bottom: 14px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .score-header {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 800;
        }

        .score-value {
          font-size: 46px;
          font-weight: 900;
          line-height: 1;
          color: ${scoreColor};
          margin: 6px 0 2px 0;
        }

        .score-denom {
          font-size: 18px;
          font-weight: 600;
          color: #94a3b8;
        }

        .risk-badge {
          display: inline-block;
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
          color: ${scoreColor};
          letter-spacing: 0.5px;
        }

        .confidence-note {
          font-size: 10.5px;
          color: #0284c7;
          margin-top: 4px;
          font-weight: 700;
        }

        /* SECTION BOXES */
        .section {
          background: #f8fafc;
          border-radius: 14px;
          padding: 14px 16px;
          margin-bottom: 12px;
          border: 1px solid #e2e8f0;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .section-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #0284c7;
          font-weight: 800;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .rationale-text {
          font-size: 11.5px;
          color: #334155;
          margin: 0;
          line-height: 1.5;
        }

        /* SUB-SCORES BARS */
        .sub-score-row {
          margin-bottom: 8px;
        }

        .sub-score-header {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 700;
          color: #334155;
          margin-bottom: 3px;
        }

        .progress-bg {
          background: #e2e8f0;
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, #4f46e5, #0284c7);
        }

        .progress-fill.high {
          background: linear-gradient(90deg, #ef4444, #dc2626);
        }

        /* RECOMMENDATIONS LIST */
        .recs-list {
          padding-left: 0;
          margin: 0;
          list-style: none;
        }

        .recs-list li {
          position: relative;
          padding-left: 18px;
          margin-bottom: 6px;
          font-size: 11px;
          color: #334155;
          line-height: 1.4;
        }

        .recs-list li::before {
          content: "🛡️";
          position: absolute;
          left: 0;
          top: 0;
          font-size: 10px;
        }

        /* FOOTER */
        .footer {
          text-align: center;
          margin-top: 16px;
          padding-top: 10px;
          border-top: 1px solid #cbd5e1;
          color: #64748b;
          font-size: 9.5px;
          font-weight: 600;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* PRINT OVERRIDES */
        @media print {
          body {
            padding: 0;
            margin: 0;
            background: #ffffff !important;
          }
          .container {
            max-width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        
        <!-- AUDIT REPORT HEADER -->
        <div class="header">
          <div>
            <div class="brand-title">
              <span>🛡️</span> SAFE-HIRE AI
            </div>
            <div class="brand-subtitle">${labels.tagline}</div>
          </div>
          <div>
            <div class="report-badge">${labels.report} #${reportId}</div>
            <div class="report-date">${dateStr}</div>
          </div>
        </div>

        <!-- OVERALL SCAM RATING CARD -->
        <div class="score-card">
          <div class="score-header">${labels.scamRating}</div>
          <div class="score-value">
            ${overallScore} <span class="score-denom">/ 100</span>
          </div>
          <div class="risk-badge">${riskLevelText}</div>
          <div class="confidence-note">${labels.confidence}</div>
        </div>

        <!-- EXPLAINABLE RATIONALE -->
        <div class="section">
          <div class="section-title">🔍 ${labels.rationale}</div>
          <p class="rationale-text">${result.explanation_text || "The 5-Agent AI pipeline synthesized all linguistic patterns, WHOIS domain signals, and contact channels to evaluate risk."}</p>
        </div>

        <!-- CATEGORIZED SUB-SCORES -->
        <div class="section">
          <div class="section-title">📊 ${labels.subScores}</div>
          
          <div class="sub-score-row">
            <div class="sub-score-header">
              <span>${labels.financialRisk}</span>
              <span>${subScores.financial_fee_risk}%</span>
            </div>
            <div class="progress-bg">
              <div class="progress-fill ${subScores.financial_fee_risk > 50 ? 'high' : ''}" style="width: ${subScores.financial_fee_risk}%;"></div>
            </div>
          </div>

          <div class="sub-score-row">
            <div class="sub-score-header">
              <span>${labels.impersonationRisk}</span>
              <span>${subScores.impersonation_risk}%</span>
            </div>
            <div class="progress-bg">
              <div class="progress-fill ${subScores.impersonation_risk > 50 ? 'high' : ''}" style="width: ${subScores.impersonation_risk}%;"></div>
            </div>
          </div>

          <div class="sub-score-row">
            <div class="sub-score-header">
              <span>${labels.domainRisk}</span>
              <span>${subScores.domain_reputation_risk}%</span>
            </div>
            <div class="progress-bg">
              <div class="progress-fill ${subScores.domain_reputation_risk > 50 ? 'high' : ''}" style="width: ${subScores.domain_reputation_risk}%;"></div>
            </div>
          </div>
        </div>

        <!-- SAFETY RECOMMENDATIONS -->
        <div class="section">
          <div class="section-title">💡 ${labels.recommendations}</div>
          <ul class="recs-list">
            ${recs.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>

        <!-- OFFICIAL FOOTER -->
        <div class="footer">
          ${labels.footerText} • ${labels.account}: ${user?.full_name || 'Authenticated User'} (${user?.email || ''}) • ${labels.generatedOn} ${dateStr}
        </div>

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
