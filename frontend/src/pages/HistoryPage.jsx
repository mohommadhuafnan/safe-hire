import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import AgentBreakdown from '../components/AgentBreakdown';
import ScamGauge from '../components/ScamGauge';
import { exportAnalysisReport } from '../services/reportExporter';
import { History as HistoryIcon, Search, ShieldCheck, X, ExternalLink, Calendar, AlertTriangle, Download } from 'lucide-react';

const HistoryPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/api/history');
        setHistoryItems(response.data);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleSelectDetail = async (subId) => {
    try {
      const response = await api.get(`/api/history/${subId}`);
      setSelectedResult(response.data);
    } catch (err) {
      console.error('Failed to fetch detail:', err);
    }
  };

  const filteredItems = historyItems.filter(item => 
    item.snippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.risk_level.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs mb-1">
            <HistoryIcon className="w-4 h-4" />
            <span>ANALYSIS RECORDS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
            {t('history.title')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('history.subtitle')}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past scans..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* HISTORY ITEMS GRID */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Loading analysis history...</div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl border border-slate-800 text-center">
          <HistoryIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-300 mb-1">{t('history.empty')}</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isSevere = item.scam_score >= 85;
            const isHigh = item.scam_score >= 60;
            const isMod = item.scam_score >= 30;

            const badgeColor = isSevere 
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
              : isHigh 
              ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' 
              : isMod 
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

            return (
              <div 
                key={item.id} 
                className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition cursor-pointer flex flex-col justify-between"
                onClick={() => handleSelectDetail(item.submission_id || item.id)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                      {item.risk_level}
                    </span>
                    <span className="text-xl font-extrabold text-slate-100">{item.scam_score} <span className="text-[10px] text-slate-500 font-normal">/100</span></span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-3 font-mono leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    "{item.snippet}"
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className="text-indigo-400 font-semibold hover:underline flex items-center">
                    Report <ExternalLink className="w-3 h-3 ml-1" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-slate-800 space-y-6 relative">
            <button 
              onClick={() => setSelectedResult(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Historical Scam Analysis Report</h3>
                  <span className="text-xs text-slate-400">Analyzed on {new Date(selectedResult.created_at).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => exportAnalysisReport(selectedResult, user)}
                className="mr-10 flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500 text-xs font-semibold text-slate-200 transition"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Export PDF</span>
              </button>
            </div>

            <ScamGauge score={selectedResult.scam_score} riskLevel={selectedResult.risk_level} />

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">Reasoning Rationale</h4>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{selectedResult.explanation_text}</p>
            </div>

            <AgentBreakdown result={selectedResult} />
          </div>
        </div>
      )}

    </div>
  );
};

export default HistoryPage;
