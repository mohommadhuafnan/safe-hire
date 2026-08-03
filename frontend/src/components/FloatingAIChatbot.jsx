import React, { useState, useEffect, useRef } from 'react';
import GeminiAPIClient from '../services/GeminiAPIClient';
import { useTranslation } from 'react-i18next';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw, 
  Trash2, 
  MessageSquare,
  ChevronDown,
  AlertCircle,
  BrainCircuit,
  User
} from 'lucide-react';

const FloatingAIChatbot = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! 👋 I'm your **SAFE-HIRE AI Assistant**.\n\nI can help you verify job offers, analyze recruiter messages, explain scam red flags, and guide you on staying safe while job hunting. How can I help you today?`
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  
  const clientRef = useRef(null);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    "🔍 How do I spot a job scam?",
    "💰 Are registration fees normal?",
    "📧 Verify recruiter email",
    "🛡️ How does SAFE-HIRE work?"
  ];

  useEffect(() => {
    clientRef.current = new GeminiAPIClient();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, isOpen]);

  const handleSendMessage = (textToSend = null) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isStreaming) return;

    const userMessage = { role: 'user', content: prompt };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputPrompt('');
    setIsStreaming(true);
    setStreamingContent('');

    // System prompt directing AI as SAFE-HIRE's Assistant
    const systemInstruction = {
      role: 'system',
      content: `You are SAFE-HIRE's friendly and authoritative AI Recruitment Security Assistant.
Answer questions about employment fraud, job scam verification, WHOIS domain security, payment demands, and safe career guidance. Keep answers concise, informative, clear, and helpful for students and job seekers.
Language preference: ${i18n.language || 'en'}.`
    };

    const apiMessages = [
      systemInstruction,
      ...updatedMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
    ];

    clientRef.current.sendMessageStream(
      apiMessages,
      {
        onToken: (fullText) => {
          setStreamingContent(fullText);
        },
        onComplete: (res) => {
          setIsStreaming(false);
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: res.content }
          ]);
          setStreamingContent('');
        },
        onError: (err) => {
          setIsStreaming(false);
          let fallbackReply = "⚠️ Connection notice: ";
          const lower = prompt.toLowerCase();
          if (lower.includes("fee") || lower.includes("registration") || lower.includes("money") || lower.includes("payment")) {
            fallbackReply += "**No, registration fees are NOT normal.** Legitimate employers NEVER charge candidates for job placement, application processing, laptop security deposits, or training modules.";
          } else if (lower.includes("scam") || lower.includes("spot") || lower.includes("fake")) {
            fallbackReply += "Here is how to spot job scams:\n\n1. **Upfront Fee Demands**: Asking money for registration/training.\n2. **Free Mail Domain**: Using @gmail.com for claimed major corporations.\n3. **Chat-Only Channels**: Telegram or WhatsApp-only hiring without real interviews.\n4. **Unrealistic Pay**: Exceptionally high pay for simple data entry tasks.";
          } else if (lower.includes("verify") || lower.includes("email") || lower.includes("domain")) {
            fallbackReply += "To verify recruiters:\n\n1. Always check official corporate careers pages.\n2. Run a domain WHOIS search to check domain registration age.\n3. Never share bank OTPs, national ID copies, or payments.";
          } else {
            fallbackReply += (err.message || "Encountered a temporary network glitch. Please try again.");
          }

          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: fallbackReply }
          ]);
          setStreamingContent('');
        }
      }
    );
  };

  const handleClearChat = () => {
    if (clientRef.current) {
      clientRef.current.cancelActiveStream();
    }
    setIsStreaming(false);
    setStreamingContent('');
    setMessages([
      {
        role: 'assistant',
        content: `Hello! 👋 I'm your **SAFE-HIRE AI Assistant**.\n\nI can help you verify job offers, analyze recruiter messages, explain scam red flags, and guide you on staying safe while job hunting. How can I help you today?`
      }
    ]);
  };

  return (
    <>
      {/* FLOATING CHATBOT TRIGGER BUTTON */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2">
        {!isOpen && (
          <div className="hidden sm:flex items-center px-3 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/40 text-[11px] font-bold text-slate-200 shadow-xl backdrop-blur-md animate-bounce">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-400" />
            <span>Need Help? Ask AI!</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle AI Assistant Chat"
          className="w-14 h-14 rounded-full bg-indigo-600 p-0.5 shadow-2xl shadow-indigo-500/50 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group border border-indigo-400/40"
        >
          <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center relative overflow-hidden">
            {isOpen ? (
              <X className="w-6 h-6 text-slate-200 group-hover:rotate-90 transition-transform duration-300" />
            ) : (
              <>
                <Bot className="w-7 h-7 text-sky-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping" />
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
              </>
            )}
          </div>
        </button>
      </div>

      {/* CHAT WINDOW PANEL */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-96 h-[530px] max-h-[82vh] bg-slate-950/95 border border-indigo-500/30 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-slate-950 flex flex-col overflow-hidden animate-fade-in">
          
          {/* HEADER */}
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 p-0.5 shadow-md">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5 text-sky-400 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-sm font-extrabold text-slate-100 leading-tight">
                    SAFE-HIRE AI Assistant
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Gemini 3.6 Flash • Real-Time Protection
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleClearChat}
                title="Reset Chat"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* MESSAGES CONTAINER */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start space-x-2.5 ${
                  msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="w-7 h-7 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5 font-bold text-[10px]">
                    <User className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-2xl max-w-[82%] leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white rounded-tr-none font-medium shadow-md'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-800/80 rounded-tl-none font-sans'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* STREAMING RESPONSE */}
            {isStreaming && (
              <div className="flex items-start space-x-2.5">
                <div className="w-7 h-7 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5 animate-spin">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-900/90 text-slate-200 border border-slate-800/80 max-w-[82%] leading-relaxed font-mono">
                  {streamingContent || 'Thinking...'}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* QUICK PROMPT CHIPS */}
          {messages.length < 4 && !isStreaming && (
            <div className="px-4 py-2 border-t border-slate-900 bg-slate-950/60 overflow-x-auto no-scrollbar flex space-x-1.5">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 whitespace-nowrap transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* INPUT FOOTER */}
          <div className="p-3 bg-slate-900/90 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask SAFE-HIRE AI Assistant..."
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isStreaming}
                className="p-2.5 rounded-xl btn-primary transition disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
};

export default FloatingAIChatbot;
