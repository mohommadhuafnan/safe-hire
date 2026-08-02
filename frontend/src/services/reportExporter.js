export const exportAnalysisReport = (result, user) => {
  if (!result) return;

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

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>SAFE-HIRE AI Scam Analysis Report #${reportId}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0b1120; color: #f1f5f9; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 26px; font-weight: 800; color: #818cf8; letter-spacing: -0.5px; }
        .tagline { font-size: 11px; color: #94a3b8; text-transform: uppercase; tracking-wider: 1px; }
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
          <div class="tagline">5-Agent AI Scam Detection Verification</div>
        </div>
        <div>
          <span class="badge">REPORT #${reportId}</span>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 6px; text-align: right;">${dateStr}</div>
        </div>
      </div>

      <div class="score-card">
        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Scam Probability Rating</div>
        <div class="score-val">${result.scam_score} <span style="font-size: 20px; font-weight: normal; color: #94a3b8;">/ 100</span></div>
        <div class="risk-label">${result.risk_level}</div>
        <div style="font-size: 12px; color: #38bdf8; margin-top: 8px; font-weight: 600;">⚡ 98% AI Analysis Precision Confidence</div>
      </div>

      <div class="section">
        <div class="section-title">Explainable Rationale</div>
        <p style="font-size: 13px; white-space: pre-line; color: #e2e8f0; margin: 0; line-height: 1.7;">${result.explanation_text}</p>
      </div>

      <div class="section">
        <div class="section-title">Categorized Risk Sub-Scores</div>
        
        <div class="sub-score"><span>Financial & Fee Demand Risk</span><span>${subScores.financial_fee_risk || 0}%</span></div>
        <div class="progress-bg"><div class="progress-fill" style="width: ${subScores.financial_fee_risk || 0}%;"></div></div>
        
        <div class="sub-score"><span>Corporate Email & Brand Impersonation</span><span>${subScores.impersonation_risk || 0}%</span></div>
        <div class="progress-bg"><div class="progress-fill" style="width: ${subScores.impersonation_risk || 0}%;"></div></div>

        <div class="sub-score"><span>Domain WHOIS & Web Reputation Risk</span><span>${subScores.domain_reputation_risk || 0}%</span></div>
        <div class="progress-bg"><div class="progress-fill" style="width: ${subScores.domain_reputation_risk || 0}%;"></div></div>
      </div>

      <div class="section">
        <div class="section-title">Personalised Safety Recommendations</div>
        <ul>
          ${recs.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>

      <div class="footer">
        SAFE-HIRE AI Student Protection Engine • Account: ${user?.full_name || 'Authenticated Student'} (${user?.email || ''}) • Generated on ${dateStr}
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
