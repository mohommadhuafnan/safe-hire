import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle, ShieldAlert, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

const ScamGauge = ({ score = 0, riskLevel = "Low Apparent Risk", confidenceScore = 95 }) => {
  const { t } = useTranslation();
  const isNotJobPoster = score === 'N/A' || riskLevel === 'Not a Job Advertisement' || riskLevel === 'Unable to Determine' || riskLevel === 'Unreadable Image' || (typeof score === 'string' && score.toUpperCase() === 'N/A');
  const numScore = isNaN(Number(score)) ? 0 : Number(score);
  const normalizedScore = Math.min(100, Math.max(0, numScore));

  const getRiskDetails = () => {
    if (isNotJobPoster) {
      return {
        color: '#38bdf8',
        bgColor: 'bg-sky-500/10',
        borderColor: 'border-sky-500/30',
        textColor: 'text-sky-400',
        label: riskLevel === 'Not a Job Advertisement' ? '⚠️ NOT A JOB ADVERTISEMENT' : '⚠️ UNREADABLE / UNCLEAR MEDIA',
        subLabel: 'Non-Recruitment Content Detected',
        icon: AlertCircle
      };
    } else if (normalizedScore >= 81) {
      return {
        color: '#f43f5e',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/30',
        textColor: 'text-rose-400',
        label: t('risk_levels.very_high_risk', 'VERY HIGH / SEVERE RISK'),
        subLabel: 'Critical Fraud Signals Detected',
        icon: ShieldAlert
      };
    } else if (normalizedScore >= 61) {
      return {
        color: '#f97316',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        textColor: 'text-orange-400',
        label: t('risk_levels.high_risk', 'HIGH SCAM RISK'),
        subLabel: 'High Fraud Probability',
        icon: AlertTriangle
      };
    } else if (normalizedScore >= 41) {
      return {
        color: '#f59e0b',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        textColor: 'text-amber-400',
        label: t('risk_levels.medium_risk', 'MODERATE / UNCERTAIN RISK'),
        subLabel: 'Suspicious Elements or Unverified Details',
        icon: AlertCircle
      };
    } else if (normalizedScore >= 21) {
      return {
        color: '#eab308',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        textColor: 'text-yellow-400',
        label: t('risk_levels.low_risk', 'LOW / MODERATE RISK'),
        subLabel: 'Minor Warnings or Standard Notice',
        icon: ShieldCheck
      };
    } else {
      return {
        color: '#10b981',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        textColor: 'text-emerald-400',
        label: '✅ LOW APPARENT RISK',
        subLabel: 'No Major Fraud Signals Detected',
        icon: CheckCircle
      };
    }
  };

  const risk = getRiskDetails();
  const IconComponent = risk.icon;

  const radius = 80;
  const circumference = Math.PI * radius;
  const strokeDashoffset = isNotJobPoster ? circumference * 0.5 : circumference - (normalizedScore / 100) * circumference;

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-3xl border ${risk.bgColor} ${risk.borderColor} glass-card relative overflow-hidden space-y-4`}>
      
      {/* Background Radial Glow */}
      <div 
        className="absolute w-44 h-44 rounded-full filter blur-3xl opacity-25 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: risk.color }}
      />

      {/* Top Confidence Badge */}
      <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-semibold text-sky-400">
        <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span>{isNotJobPoster ? 'Classification N/A' : `${confidenceScore}% AI Confidence`}</span>
      </div>

      {/* Gauge Arc */}
      <div className="relative w-56 h-30 flex justify-center">
        <svg className="w-56 h-56 transform -rotate-180" viewBox="0 0 200 200">
          <path
            d="M 20,100 A 80,80 0 0,1 180,100"
            fill="none"
            stroke="#1e293b"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M 20,100 A 80,80 0 0,1 180,100"
            fill="none"
            stroke={risk.color}
            strokeWidth="16"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Score Display */}
        <div className="absolute top-8 flex flex-col items-center text-center px-2">
          <span className="text-4xl font-extrabold text-white tracking-tight">
            {isNotJobPoster ? 'N/A' : normalizedScore}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">
            {isNotJobPoster ? 'NOT A JOB AD' : t('dashboard.scam_score', 'Scam Risk Score')}
          </span>
          <span className="text-[9px] font-medium text-slate-400 mt-0.5">
            {risk.subLabel}
          </span>
        </div>
      </div>

      {/* Risk Badge */}
      <div className={`px-4 py-1.5 rounded-full flex items-center space-x-2 border ${risk.borderColor} ${risk.bgColor}`}>
        <IconComponent className={`w-4 h-4 ${risk.textColor}`} />
        <span className={`text-xs font-extrabold ${risk.textColor} uppercase tracking-wider`}>
          {risk.label}
        </span>
      </div>

    </div>
  );
};

export default ScamGauge;
