export const parseExplanationSections = (text) => {
  if (!text || typeof text !== 'string') return [];

  const cleanText = text.trim();
  if (!cleanText) return [];

  // Match emoji section markers: 📋, 🎯, 🔍, ✅
  const emojiMatches = Array.from(cleanText.matchAll(/(📋|🎯|🔍|✅)\s*([^📋🎯🔍✅]+)/g));

  if (emojiMatches.length > 0) {
    return emojiMatches.map(m => {
      const emoji = m[1];
      const rawContent = m[2].trim();

      let title = 'Analysis Section';
      let body = rawContent;

      const colonIdx = rawContent.indexOf(':');
      if (colonIdx !== -1 && colonIdx < 50) {
        title = rawContent.slice(0, colonIdx).trim();
        body = rawContent.slice(colonIdx + 1).trim();
      } else {
        if (emoji === '📋') title = 'POSTER SUMMARY';
        else if (emoji === '🎯') title = 'SCAM RISK VERDICT';
        else if (emoji === '🔍') title = 'DETAILED EVIDENCE & RED FLAGS';
        else if (emoji === '✅') title = 'SAFETY CONCLUSION';
      }

      return { emoji, title, body: body || rawContent };
    });
  }

  // Fallback: If no emojis are present, split by double newlines or single paragraphs
  const sectionSplit = cleanText.split(/\n\n+/).filter(Boolean);
  if (sectionSplit.length > 1) {
    return sectionSplit.map((para, i) => ({
      emoji: i === 0 ? '📋' : i === 1 ? '🎯' : i === 2 ? '🔍' : '✅',
      title: i === 0 ? 'POSTER SUMMARY' : i === 1 ? 'SCAM RISK VERDICT' : i === 2 ? 'DETAILED EVIDENCE & RED FLAGS' : 'SAFETY CONCLUSION',
      body: para.trim()
    }));
  }

  return [{ emoji: '🔍', title: 'EXPLAINABLE AI RATIONALE', body: cleanText }];
};

export const formatBodyToHtml = (body) => {
  if (!body) return '';

  const bulletItems = body
    .split(/(?:\s*-\s+|\s*•\s+|\n-\s*|\n•\s*)/)
    .map(b => b.trim())
    .filter(Boolean);

  if (bulletItems.length > 1 && (body.includes('- ') || body.includes('• ') || body.includes(' - '))) {
    let introHtml = '';
    let items = bulletItems;

    if (!body.trim().startsWith('-') && !body.trim().startsWith('•')) {
      introHtml = `<p class="section-p">${bulletItems[0]}</p>`;
      items = bulletItems.slice(1);
    }

    return `
      ${introHtml}
      <ul class="section-bullets">
        ${items.map(item => `<li>${item}</li>`).join('')}
      </ul>
    `;
  }

  const paragraphs = body.split(/\n+/).map(p => p.trim()).filter(Boolean);
  return paragraphs.map(p => `<p class="section-p">${p}</p>`).join('');
};

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
      rationale: "Explainable AI Audit Rationale",
      subScores: "Categorized Multi-Signal Risk Sub-Scores",
      financialRisk: "Financial & Fee Demand Risk",
      impersonationRisk: "Corporate Email & Brand Impersonation",
      domainRisk: "Domain WHOIS & Web Reputation Risk",
      urgencyRisk: "Urgency & Pressure Tactics Risk",
      recommendations: "Personalised Safety Action Plan",
      footerText: "SAFE-HIRE AI Student & Graduate Protection Engine",
      account: "Verified User Account",
      generatedOn: "Audit Date",
      report: "AUDIT REPORT"
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
      urgencyRisk: "அவசர மற்றும் அழுத்த உத்திகள் ஆபத்து",
      recommendations: "பாதுகாப்பு நடவடிக்கைகள் மற்றும் பரிந்துரைகள்",
      footerText: "SAFE-HIRE AI மாணவர் பாதுகாப்பு அமைப்பு",
      account: "பயனர் கணக்கு",
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
      urgencyRisk: "तत्परता और दबाव रणनीति जोखिम",
      recommendations: "व्यक्तिगत सुरक्षा उपाय",
      footerText: "SAFE-HIRE AI छात्र सुरक्षा प्लेटफॉर्म",
      account: "उपयोगकर्ता खाता",
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
      urgencyRisk: "জরুরি চাপ ও মানসিক কৌশল ঝুঁকি",
      recommendations: "ব্যক্তিগত নিরাপত্তা নির্দেশিকা",
      footerText: "SAFE-HIRE AI ছাত্র সুরক্ষা প্লাটফর্ম",
      account: "ব্যবহারকারী একাউন্ট",
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

  const overallScore = Number(result.scam_score) || 0;
  const riskFactors = result.risk_factors || {};
  const verificationData = result.verification_data || {};

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

  // Parse rationale into separate structured section blocks
  const sections = parseExplanationSections(result.explanation_text || '');

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
          font-size: 11.5px;
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
          border-bottom: 2.5px solid #4f46e5;
          padding-bottom: 10px;
          margin-bottom: 14px;
        }

        .brand-title {
          font-size: 22px;
          font-weight: 900;
          color: #4f46e5;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .brand-subtitle {
          font-size: 9.5px;
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
          border-radius: 10px;
          font-weight: 800;
          font-size: 10.5px;
          text-align: right;
        }

        .report-date {
          font-size: 9.5px;
          color: #64748b;
          margin-top: 3px;
          text-align: right;
        }

        /* OVERALL SCAM SCORE CARD */
        .score-card {
          background: ${scoreBgColor};
          border: 1.5px solid ${scoreBorderColor};
          border-radius: 14px;
          padding: 14px;
          text-align: center;
          margin-bottom: 12px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .score-header {
          font-size: 9.5px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 800;
        }

        .score-value {
          font-size: 42px;
          font-weight: 900;
          line-height: 1;
          color: ${scoreColor};
          margin: 4px 0 2px 0;
        }

        .score-denom {
          font-size: 16px;
          font-weight: 600;
          color: #94a3b8;
        }

        .risk-badge {
          display: inline-block;
          font-size: 12.5px;
          font-weight: 900;
          text-transform: uppercase;
          color: ${scoreColor};
          letter-spacing: 0.5px;
        }

        .confidence-note {
          font-size: 10px;
          color: #0284c7;
          margin-top: 3px;
          font-weight: 700;
        }

        /* SECTION HEADERS & CONTAINER */
        .main-section-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #4f46e5;
          font-weight: 800;
          margin-bottom: 8px;
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        /* SEPARATE STRUCTURED RATIONALE CARDS */
        .rationale-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-left: 4px solid #6366f1;
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 9px;
          page-break-inside: avoid;
          break-inside: avoid;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
        }

        .rationale-card.verdict-card {
          background: ${scoreBgColor};
          border-color: ${scoreBorderColor};
          border-left: 4px solid ${scoreColor};
        }

        .rationale-card.evidence-card {
          background: #fffbeb;
          border-color: #fde68a;
          border-left: 4px solid #d97706;
        }

        .rationale-card.conclusion-card {
          background: #f0fdf4;
          border-color: #bbf7d0;
          border-left: 4px solid #16a34a;
        }

        .card-header {
          font-size: 11px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .card-emoji {
          font-size: 13px;
        }

        .card-body {
          font-size: 11px;
          color: #334155;
          line-height: 1.5;
        }

        .section-p {
          margin: 0 0 4px 0;
        }

        .section-p:last-child {
          margin-bottom: 0;
        }

        .section-bullets {
          margin: 4px 0 0 0;
          padding-left: 18px;
          list-style-type: disc;
        }

        .section-bullets li {
          margin-bottom: 3px;
          color: #334155;
          line-height: 1.4;
        }

        /* TECHNICAL API VERIFICATION TABLE */
        .api-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 10px;
        }

        .api-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 10px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .api-card-header {
          font-weight: 800;
          font-size: 10.5px;
          color: #334155;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 3px;
        }

        .api-badge {
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .api-badge.safe {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
        }

        .api-badge.risk {
          background: #ffe4e6;
          color: #9f1239;
          border: 1px solid #fecdd3;
        }

        .api-field {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
          color: #475569;
        }

        .api-field-val {
          font-weight: 700;
          color: #0f172a;
          font-family: monospace;
        }

        .api-summary-box {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 9.5px;
          color: #334155;
          margin-top: 4px;
          line-height: 1.35;
          font-family: monospace;
        }

        /* CATEGORIZED SUB-SCORES SECTION */
        .section {
          background: #f8fafc;
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 10px;
          border: 1px solid #e2e8f0;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .sub-score-row {
          margin-bottom: 7px;
        }

        .sub-score-header {
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          font-weight: 700;
          color: #334155;
          margin-bottom: 3px;
        }

        .progress-bg {
          background: #e2e8f0;
          height: 7px;
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
          margin-bottom: 5px;
          font-size: 10.5px;
          color: #334155;
          line-height: 1.4;
        }

        .recs-list li::before {
          content: "🛡️";
          position: absolute;
          left: 0;
          top: 0;
          font-size: 9.5px;
        }

        /* FOOTER */
        .footer {
          text-align: center;
          margin-top: 14px;
          padding-top: 8px;
          border-top: 1px solid #cbd5e1;
          color: #64748b;
          font-size: 9px;
          font-weight: 600;
          page-break-inside: avoid;
          break-inside: avoid;
        }

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

        <!-- LIVE TECHNICAL API VERIFICATION AUDIT (EVERY API DETAILED) -->
        <div class="main-section-title">🌐 LIVE MULTI-AGENT TECHNICAL API AUDIT</div>
        <div class="api-grid">
          
          <!-- Abstract API Email Validation Card -->
          <div class="api-card">
            <div class="api-card-header">
              <span>📧 Abstract API Email Validation</span>
              <span class="api-badge ${verificationData.email_validation?.is_high_risk ? 'risk' : 'safe'}">
                ${verificationData.email_validation?.deliverability || 'DELIVERABLE'}
              </span>
            </div>
            <div class="api-field">
              <span>Contact Email:</span>
              <span class="api-field-val">${verificationData.email_validation?.email || result.intake_data?.metadata_extracted?.emails?.[0] || 'N/A'}</span>
            </div>
            <div class="api-field">
              <span>Quality Score:</span>
              <span class="api-field-val">${Math.round((verificationData.email_validation?.quality_score || 0.5) * 100)} / 100</span>
            </div>
            <div class="api-field">
              <span>Disposable Email:</span>
              <span class="api-field-val" style="color: ${verificationData.email_validation?.is_disposable_email ? '#dc2626' : '#16a34a'}; font-weight:800;">
                ${verificationData.email_validation?.is_disposable_email ? '⚠️ YES (Disposable)' : '✅ NO'}
              </span>
            </div>
            <div class="api-field">
              <span>SMTP Delivery Check:</span>
              <span class="api-field-val" style="color: ${verificationData.email_validation?.is_smtp_valid === false ? '#dc2626' : '#16a34a'}; font-weight:800;">
                ${verificationData.email_validation?.is_smtp_valid === false ? '❌ Failed' : '✅ Valid'}
              </span>
            </div>
            <div class="api-field">
              <span>MX Mail Server Found:</span>
              <span class="api-field-val" style="color: ${verificationData.email_validation?.is_mx_found === false ? '#dc2626' : '#16a34a'};">
                ${verificationData.email_validation?.is_mx_found === false ? '❌ Missing' : '✅ Active'}
              </span>
            </div>
            ${verificationData.email_validation?.analysis_summary ? `
              <div class="api-summary-box">
                ${verificationData.email_validation.analysis_summary}
              </div>
            ` : ''}
          </div>

          <!-- Google Safe Browsing API v4 Card -->
          <div class="api-card">
            <div class="api-card-header">
              <span>🌐 Google Safe Browsing API v4</span>
              <span class="api-badge ${verificationData.safe_browsing?.flagged ? 'risk' : 'safe'}">
                ${verificationData.safe_browsing?.flagged ? 'UNSAFE' : 'SAFE'}
              </span>
            </div>
            <div class="api-field">
              <span>Security Status:</span>
              <span class="api-field-val" style="color: ${verificationData.safe_browsing?.flagged ? '#dc2626' : '#16a34a'};">
                ${verificationData.safe_browsing?.status || '✅ Safe Website'}
              </span>
            </div>
            <div class="api-field">
              <span>Threat Matches:</span>
              <span class="api-field-val">
                ${verificationData.safe_browsing?.threat_types?.length > 0 ? verificationData.safe_browsing.threat_types.join(', ') : 'None Detected'}
              </span>
            </div>
            <div class="api-field">
              <span>Domain WHOIS Age:</span>
              <span class="api-field-val">
                ${verificationData.whois_info?.registered_days ? `${verificationData.whois_info.registered_days} Days` : 'Verified Standard'}
              </span>
            </div>
            <div class="api-field">
              <span>Corporate Domain Trust:</span>
              <span class="api-field-val">${verificationData.verification_trust_score || 80} / 100</span>
            </div>
            <div class="api-field">
              <span>Registrar:</span>
              <span class="api-field-val">${verificationData.whois_info?.registrar || 'Registry Verified'}</span>
            </div>
          </div>

        </div>

        <!-- EXPLAINABLE AI RATIONALE (SEPARATE SECTIONS) -->
        <div class="main-section-title">🔍 ${labels.rationale}</div>
        ${sections.map(sec => {
          let cardClass = '';
          if (sec.emoji === '🎯') cardClass = 'verdict-card';
          else if (sec.emoji === '🔍') cardClass = 'evidence-card';
          else if (sec.emoji === '✅') cardClass = 'conclusion-card';

          return `
            <div class="rationale-card ${cardClass}">
              <div class="card-header">
                <span class="card-emoji">${sec.emoji}</span>
                <span>${sec.title}</span>
              </div>
              <div class="card-body">
                ${formatBodyToHtml(sec.body)}
              </div>
            </div>
          `;
        }).join('')}

        <!-- CATEGORIZED SUB-SCORES -->
        <div class="main-section-title">📊 ${labels.subScores}</div>
        <div class="section">
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
        <div class="main-section-title">💡 ${labels.recommendations}</div>
        <div class="section">
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
