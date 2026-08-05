import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useAIModal } from '../context/AIModalContext';
import api from '../services/api';
import AgentBreakdown from '../components/AgentBreakdown';
import ScamGauge from '../components/ScamGauge';
import { exportAnalysisReport } from '../services/reportExporter';
import { 
  History as HistoryIcon, 
  Search, 
  ShieldCheck, 
  X, 
  ExternalLink, 
  Calendar, 
  AlertTriangle, 
  Download, 
  Sparkles,
  Trash2,
  Trash
} from 'lucide-react';

const HistoryPage = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { openAIModal } = useAIModal();
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

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

  const handleSelectDetail = async (subId) => {
    try {
      const response = await api.get(`/api/history/${subId}`);
      const detail = response.data;
      openAIModal({
        title: `Gemini 3.6 Flash Historical Scam Audit (Score: ${detail.scam_score}/100)`,
        initialPrompt: `Re-analyze this past verification report from ${new Date(detail.created_at).toLocaleDateString()}:\nSnippet: "${detail.snippet || detail.explanation_text}"\nRisk Score: ${detail.scam_score}/100 (${detail.risk_level})\nWhat safety actions should the user take?`,
        category: 'history_audit',
        contextData: detail
      });
    } catch (err) {
      console.error('Failed to fetch detail:', err);
    }
  };

  const handleDeleteItem = async (e, id) => {
    e.stopPropagation();
    if (!id) return;
    
    setDeletingId(id);
    try {
      await api.delete(`/api/history/${id}`);
      setHistoryItems(prev => prev.filter(item => item.id !== id && item.submission_id !== id));
    } catch (err) {
      console.error('Failed to delete history item:', err);
      // Remove locally from state anyway for UI responsiveness
      setHistoryItems(prev => prev.filter(item => item.id !== id && item.submission_id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAllHistory = async () => {
    setClearingAll(true);
    try {
      await api.delete('/api/history');
      setHistoryItems([]);
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Failed to clear history:', err);
      setHistoryItems([]);
      setShowClearConfirm(false);
    } finally {
      setClearingAll(false);
    }
  };

  const filteredItems = historyItems.filter(item => 
    item.snippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.risk_level.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-10 space-y-6 sm:space-y-8">
      
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 glass-panel p-5 sm:p-7 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs mb-1">
            <HistoryIcon className="w-4 h-4 text-emerald-400" />
            <span>ANALYSIS RECORDS • {historyItems.length} {historyItems.length === 1 ? 'RECORD' : 'RECORDS'} STORED</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            {t('history.title', 'Your Analysis History')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('history.subtitle', 'View, review, or clear your previous scam verifications.')}
          </p>
        </div>

        {/* SEARCH AND CLEAR ALL CONTROLS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past scans..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Clear All History Button */}
          {historyItems.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center justify-center space-x-2"
              title="Clear All Analysis Records"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* CLEAR ALL CONFIRMATION MODAL */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-rose-500/30 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-100">Clear All History?</h3>
                <p className="text-xs text-slate-400">This will permanently delete all stored scan records.</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 leading-relaxed">
              Are you sure you want to remove all <strong>{historyItems.length}</strong> scam verification records? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                disabled={clearingAll}
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllHistory}
                disabled={clearingAll}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30 flex items-center space-x-1.5"
              >
                {clearingAll ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Clear All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY ITEMS GRID */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs font-mono">Loading analysis history...</div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-card p-12 sm:p-16 rounded-3xl border border-slate-800 text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
            <HistoryIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-slate-300">{t('history.empty', 'No Analysis Records Found')}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery ? 'No history items matched your search query.' : 'Submit a job offer text, image, or URL on the Dashboard to trigger 5-Agent AI scam verification.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
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

            const isDeleting = deletingId === item.id || deletingId === item.submission_id;

            return (
              <div 
                key={item.id} 
                className={`glass-card p-5 rounded-3xl border border-slate-800 hover:border-indigo-500/40 transition cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                  isDeleting ? 'opacity-40 pointer-events-none' : ''
                }`}
                onClick={() => handleSelectDetail(item.submission_id || item.id)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${badgeColor}`}>
                      {item.risk_level}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-extrabold text-slate-100">{item.scam_score} <span className="text-[10px] text-slate-500 font-normal">/100</span></span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-3 font-mono leading-relaxed bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                    "{item.snippet}"
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Export PDF Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportAnalysisReport(item, user, i18n.language);
                      }}
                      className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-sky-300 transition border border-slate-700/60"
                      title="Export PDF Audit Report"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Item Button */}
                    <button
                      onClick={(e) => handleDeleteItem(e, item.id || item.submission_id)}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 transition border border-rose-500/20"
                      title="Delete This Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* View Report Link */}
                    <span className="text-indigo-400 font-semibold hover:underline flex items-center pl-1 text-[11px]">
                      Report <ExternalLink className="w-3 h-3 ml-1" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default HistoryPage;
