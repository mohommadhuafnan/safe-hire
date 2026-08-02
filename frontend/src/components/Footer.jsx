import React from 'react';
import { Shield, Building2, AlertTriangle, ExternalLink } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/80 pt-10 pb-8 px-6 text-slate-400 text-xs mt-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        
        {/* Col 1 */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-slate-200 text-sm">SAFE-HIRE AI</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Multi-agent AI scam detection pipeline empowering students and job seekers across South Asia to verify job postings before applying.
          </p>
        </div>

        {/* Col 2 */}
        <div>
          <h4 className="font-semibold text-slate-200 mb-3 text-xs uppercase tracking-wider">5 AI Agents</h4>
          <ul className="space-y-2 text-slate-400">
            <li>1. Intake & Multi-language OCR Agent</li>
            <li>2. EMSCAD Linguistic Risk Agent</li>
            <li>3. WHOIS & Safe Browsing Verification</li>
            <li>4. Explainable Reasoning Engine</li>
            <li>5. Personalised Safety Recommendation Agent</li>
          </ul>
        </div>

        {/* Col 3 */}
        <div>
          <h4 className="font-semibold text-slate-200 mb-3 text-xs uppercase tracking-wider">Emergency Helplines</h4>
          <ul className="space-y-2 text-slate-400">
            <li className="flex items-center space-x-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Sri Lanka: CERT (101) / Cyber Crime</span>
            </li>
            <li className="flex items-center space-x-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>India: National Cyber Crime (1930)</span>
            </li>
            <li className="flex items-center space-x-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Bangladesh: Cyber Crime Helpline (13219)</span>
            </li>
          </ul>
        </div>

        {/* Col 4 */}
        <div>
          <h4 className="font-semibold text-slate-200 mb-3 text-xs uppercase tracking-wider">University Integration</h4>
          <p className="text-slate-400 mb-3">
            Designed for career guidance centers & recruitment portals.
          </p>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-indigo-400 font-medium">
            <Building2 className="w-3.5 h-3.5" />
            <span>Higher Education Portal Ready</span>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between text-slate-500">
        <p>© 2026 SAFE-HIRE AI. Built for student recruitment protection.</p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <span className="hover:text-slate-300 transition">Privacy Policy</span>
          <span className="hover:text-slate-300 transition">Terms of Service</span>
          <span className="hover:text-slate-300 transition">University Partners</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
