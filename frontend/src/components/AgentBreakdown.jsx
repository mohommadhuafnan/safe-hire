import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronDown, 
  ChevronUp, 
  FileSearch, 
  AlertTriangle, 
  Globe, 
  BrainCircuit, 
  ShieldCheck,
  CheckCircle2,
  XCircle,
  BarChart3,
  Layers,
  Sparkles
} from 'lucide-react';

const AgentBreakdown = ({ result }) => {
  const { t } = useTranslation();
  const [openAgent, setOpenAgent] = useState('agent-2');

  if (!result) return null;

  const toggleAgent = (id) => {
    setOpenAgent(openAgent === id ? null : id);
  };

  const riskFactors = result.risk_factors || {};
  const verificationData = result.verification_data || {};
  const intakeData = result.intake_data || {};
  const breakdownSignals = result.breakdown_signals || [];

  // Sub-scores map
  const subScores = result.sub_scores || {
    financial_fee_risk: riskFactors.has_payment_demand ? 95 : 10,
    impersonation_risk: riskFactors.has_impersonation_risk ? 85 : 15,
    domain_reputation_risk: 100 - (verificationData.verification_trust_score || 80),
    urgency_pressure_risk: riskFactors.has_urgency_tactics ? 75 : 10
  };

  const subScoreBars = [
    { label: t('dashboard.financial_risk', 'Financial & Fee Demand Risk'), score: subScores.financial_fee_risk || 0, color: 'from-rose-500 to-red-600' },
    { label: t('dashboard.impersonation_risk', 'Brand & Email Impersonation'), score: subScores.impersonation_risk || 0, color: 'from-orange-500 to-amber-500' },
    { label: t('dashboard.domain_risk', 'Domain WHOIS & Web Reputation Risk'), score: subScores.domain_reputation_risk || 0, color: 'from-amber-500 to-yellow-500' },
    { label: t('dashboard.urgency_risk', 'Urgency & Pressure Tactics Risk'), score: subScores.urgency_pressure_risk || 0, color: 'from-sky-500 to-indigo-500' }
  ];

  const agents = [
    {
      id: 'agent-1',
      number: '1',
      title: t('agents.agent_1_title', 'Intake Agent (OCR & Entity Mining)'),
      icon: FileSearch,
      summary: `${t('agents.extracted_lang', 'Extracted Language')}: ${result.language?.toUpperCase() || 'EN'}`,
      badge: t('agents.agent_1_badge', 'Processed'),
      content: (
        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span>Primary Language:</span>
            <span className="font-semibold text-sky-400 uppercase">{result.language || 'English'}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span>Ingestion Processing Status:</span>
            <span className="font-semibold text-emerald-400">Text & Metadata Extracted</span>
          </div>

          {(intakeData?.ocr_text || result.risk_factors?.ocr_text) && (
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <span className="font-semibold block mb-1 text-slate-200">OCR Screenshot Extracted Text:</span>
              <p className="text-[11px] text-slate-400 font-mono leading-relaxed bg-slate-950 p-2 rounded border border-slate-800/80 whitespace-pre-wrap max-h-48 overflow-y-auto">
                "{intakeData?.ocr_text || result.risk_factors?.ocr_text}"
              </p>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'agent-2',
      number: '2',
      title: t('agents.agent_2_title', 'Linguistic Risk Agent (EMSCAD NLP)'),
      icon: AlertTriangle,
      summary: `${t('agents.linguistic_score', 'Linguistic Risk Score')}: ${riskFactors.linguistic_score || 0}/100`,
      badge: (riskFactors.linguistic_score || 0) > 40 ? t('agents.agent_2_badge_risk', 'Risk Signals') : t('agents.agent_2_badge_clean', 'Clean Text'),
      content: (
        <div className="space-y-3 text-xs">
          {/* Payment Demand Indicator */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-300 font-medium">Upfront Payment / Fee Demands:</span>
            {riskFactors.has_payment_demand ? (
              <span className="flex items-center text-rose-400 font-bold">
                <XCircle className="w-4 h-4 mr-1" /> Flagged Demand
              </span>
            ) : (
              <span className="flex items-center text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 mr-1" /> No Fee Requests
              </span>
            )}
          </div>

          {/* Urgency Pressure Tactics */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-300 font-medium">Urgency Pressure Tactics:</span>
            {riskFactors.has_urgency_tactics ? (
              <span className="flex items-center text-amber-400 font-bold">
                <AlertTriangle className="w-4 h-4 mr-1" /> Urgency Keywords Found
              </span>
            ) : (
              <span className="flex items-center text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Normal Timeline
              </span>
            )}
          </div>

          {/* Corporate Impersonation Check */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-300 font-medium">Corporate Email Mismatch:</span>
            {riskFactors.has_impersonation_risk ? (
              <span className="flex items-center text-rose-400 font-bold">
                <XCircle className="w-4 h-4 mr-1" /> Free Email Domain (@{riskFactors.free_email})
              </span>
            ) : (
              <span className="flex items-center text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Verified Domain Email
              </span>
            )}
          </div>

          {/* Suspicious Channels */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-300 font-medium">Suspicious Contact Channels:</span>
            {riskFactors.has_suspicious_channels ? (
              <span className="flex items-center text-amber-400 font-bold">
                <AlertTriangle className="w-4 h-4 mr-1" /> Informal Channels Detected
              </span>
            ) : (
              <span className="flex items-center text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Official Channels Used
              </span>
            )}
          </div>

          {/* Matched Keywords list */}
          {riskFactors.matched_payment?.length > 0 && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
              <span className="font-semibold block mb-1">🚨 Flagged Financial Terms:</span>
              <div className="flex flex-wrap gap-1.5">
                {riskFactors.matched_payment.slice(0, 8).map((kw, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-rose-500/20 text-[10px] font-mono">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {riskFactors.impersonation_flags?.length > 0 && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <span className="font-semibold block mb-1">🎭 Impersonation Flags:</span>
              <ul className="space-y-0.5">
                {riskFactors.impersonation_flags.map((flag, i) => (
                  <li key={i} className="text-[11px]">• {flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'agent-3',
      number: '3',
      title: t('agents.agent_3_title', 'Verification Agent (WHOIS & Safe Browsing)'),
      icon: Globe,
      summary: `${t('agents.domain_trust', 'Domain Trust Rating')}: ${verificationData.verification_trust_score || 80}/100`,
      badge: verificationData.verification_trust_score > 60 ? t('agents.agent_3_badge_trusted', 'Trusted Domain') : t('agents.agent_3_badge_suspicious', 'Suspicious Web Record'),
      content: (
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-300 font-medium">Target Domain:</span>
            <span className="font-mono text-sky-400 font-bold">{verificationData.domain || 'Not Specified'}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-300 font-medium">Domain Age:</span>
            <span className={`font-semibold ${verificationData.whois_info?.is_new_domain ? 'text-rose-400' : 'text-emerald-400'}`}>
              {verificationData.whois_info?.domain_years ? `${verificationData.whois_info.domain_years} Years (${verificationData.whois_info.registered_days} Days Old)` : (verificationData.whois_info?.registered_days ? `${verificationData.whois_info.registered_days} Days Old` : 'Verified Registry Standard')}
            </span>
          </div>

          {verificationData.whois_info?.creation_date && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-300 font-medium">Domain Registration Date:</span>
              <span className="font-mono text-slate-200">{new Date(verificationData.whois_info.creation_date).toLocaleDateString()}</span>
            </div>
          )}

          {verificationData.whois_info?.registrar && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-300 font-medium">Domain Registrar:</span>
              <span className="font-semibold text-slate-300">{verificationData.whois_info.registrar}</span>
            </div>
          )}

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-300 font-medium">WHOIS Domain Security Status:</span>
            <span className={`font-semibold ${verificationData.whois_info?.is_new_domain ? 'text-rose-400' : 'text-emerald-400'}`}>
              {verificationData.whois_info?.whois_status || 'Domain Registry Standard'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-slate-300 font-medium">Google Safe Browsing API:</span>
            <span className={`font-semibold ${verificationData.safe_browsing?.flagged ? 'text-rose-400' : 'text-emerald-400'}`}>
              {verificationData.safe_browsing?.status || 'SAFE'}
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'agent-4',
      number: '4',
      title: t('agents.agent_4_title', 'Reasoning Agent (Deep AI Engine)'),
      icon: BrainCircuit,
      summary: t('agents.reasoning_summary', 'AI Explainable Rationale Synthesized'),
      badge: t('agents.agent_4_badge', 'Deep AI'),
      content: (
        <div className="space-y-3">
          {/* Full structured AI explanation */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 text-xs leading-relaxed whitespace-pre-line">
            {result.explanation_text}
          </div>

          {/* Breakdown signals from Gemini/DeepSeek AI */}
          {breakdownSignals.length > 0 && (
            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <span className="font-bold text-indigo-300 text-xs block mb-2 flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI-Detected Risk Signals
              </span>
              <ul className="space-y-1.5">
                {breakdownSignals.map((signal, i) => (
                  <li key={i} className="flex items-start space-x-2 text-xs text-slate-300">
                    <span className="text-indigo-400 font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                    <span className="leading-relaxed">{signal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'agent-5',
      number: '5',
      title: t('agents.agent_5_title', 'Recommendation Agent'),
      icon: ShieldCheck,
      summary: `${result.recommendations?.length || 0} ${t('agents.tailored_items', 'Tailored Safety Action Items')}`,
      badge: t('agents.agent_5_badge', 'Action Plan'),
      content: (
        <ul className="space-y-2 text-xs">
          {result.recommendations?.map((rec, idx) => (
            <li key={idx} className={`flex items-start space-x-2 p-2.5 rounded-lg border text-slate-200 ${
              rec.startsWith('🚨') ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' :
              rec.startsWith('⚠️') ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' :
              rec.startsWith('📵') ? 'bg-sky-500/10 border-sky-500/30 text-sky-200' :
              rec.startsWith('🌐') ? 'bg-orange-500/10 border-orange-500/30 text-orange-200' :
              'bg-slate-900/80 border-slate-800'
            }`}>
              <span className="text-indigo-400 font-bold flex-shrink-0">{idx + 1}.</span>
              <span className="leading-relaxed">{rec}</span>
            </li>
          ))}
        </ul>
      )
    }
  ];


  return (
    <div className="space-y-6 mt-6">
      
      {/* GRANULAR SUB-SCORE PROGRESS BARS */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center">
          <BarChart3 className="w-4 h-4 mr-2 text-sky-400" />
          {t('dashboard.risk_breakdown', 'Categorized Multi-Signal Risk Breakdown')}
        </h3>

        <div className="space-y-2.5">
          {subScoreBars.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300 font-medium">{item.label}</span>
                <span className="font-bold text-slate-200">{item.score}%</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className={`h-full bg-gradient-to-r ${item.color} transition-all duration-700`}
                  style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5-AGENT ACCORDION */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center">
          <Layers className="w-4 h-4 mr-2 text-indigo-400" />
          {t('dashboard.pipeline_findings', '5-AGENT AI PIPELINE FINDINGS')}
        </h3>

        {agents.map((agent) => {
          const isOpen = openAgent === agent.id;

          return (
            <div 
              key={agent.id} 
              className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleAgent(agent.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-900/50 transition text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                    {agent.number}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">{agent.title}</h4>
                    <span className="text-xs text-slate-400">{agent.summary}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {agent.badge}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="p-4 pt-0 border-t border-slate-900/80">
                  {agent.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default AgentBreakdown;
