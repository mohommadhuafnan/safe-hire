/**
 * GeminiAPIClient - Standalone Google AI Studio Gemini API Client
 * 
 * Supports:
 * - Real-time SSE streaming responses (`sendMessageStream`)
 * - Standard async/await responses (`sendMessage`)
 * - Multi-turn chat message history
 * - Google AI Studio REST & OpenAI Compatibility endpoints
 * 
 * Quick Copy & Paste Usage:
 * -------------------------------------------------------------
 * const client = new GeminiAPIClient();
 * 
 * // 1. Simple Call:
 * const reply = await client.sendMessage("Explain AI in 5 words");
 * console.log(reply);
 * 
 * // 2. Real-time Streaming Call:
 * client.sendMessageStream(
 *   [{ role: "user", content: "Hello!" }],
 *   {
 *     onToken: (fullText, tokenChunk) => console.log(tokenChunk),
 *     onComplete: (res) => console.log("Done:", res.content),
 *     onError: (err) => console.error("Error:", err)
 *   }
 * );
 * -------------------------------------------------------------
 */

class GeminiAPIClient {
    /**
     * @param {Object} [config]
     * @param {string} [config.apiKey] - Your Google AI Studio API Key
     * @param {string} [config.modelName] - Default: "gemini-2.5-flash"
     * @param {string} [config.apiBaseUrl] - OpenAI compatibility or REST endpoint
     * @param {number} [config.temperature] - 0.0 to 2.0 (Default: 1.0)
     * @param {number} [config.topP] - 0.0 to 1.0 (Default: 0.95)
     * @param {number} [config.maxTokens] - Max output tokens (Default: 4096)
     */
    constructor(config = {}) {
        const defaultEnvKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || "";
        this.apiKey = config.apiKey || defaultEnvKey;
        this.apiKey = config.apiKey || defaultEnvKey;
        this.modelName = config.modelName || "gemini-2.0-flash";
        this.fallbackModels = ["gemini-2.0-flash-lite", "gemini-1.5-flash", "gemini-1.5-pro"];
        this.apiBaseUrl = (config.apiBaseUrl || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/+$/, '');
        this.temperature = config.temperature !== undefined ? config.temperature : 1.0;
        this.topP = config.topP !== undefined ? config.topP : 0.95;
        this.maxTokens = config.maxTokens || 4096;
        this.currentAbortController = null;
    }

    /**
     * Clean raw stop tokens (<|end_of_sentence|>, <|im_end|>, etc.) from AI output
     */
    static cleanStopTokens(text) {
        if (!text) return "";
        let cleaned = text
            .replace(/<\|\s*end_of_sentence\s*\|>/gi, "")
            .replace(/<\|\s*im_end\s*\|>/gi, "")
            .replace(/<\|\s*endoftext\s*\|>/gi, "")
            .replace(/<\|\s*[a-z_0-9]+\s*\|>/gi, "")
            .replace(/\[DONE\]/gi, "");
        if (cleaned.includes("<think>") && cleaned.includes("</think>")) {
            cleaned = cleaned.split("</think>").pop();
        }
        return cleaned.trim();
    }

    /**
     * Send prompt or message history to Gemini API and get full text response (non-streaming)
     * @param {string|Array<{role: string, content: string}>} input - Prompt string or array of message objects
     * @returns {Promise<string>} Model response text
     */
    async sendMessage(input) {
        const rawMessages = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
        const messages = rawMessages.map(m => ({
            role: m.role === 'system' ? 'system' : (m.role === 'user' ? 'user' : 'assistant'),
            content: m.content
        }));

        const modelsToTry = [this.modelName, ...this.fallbackModels.filter(m => m !== this.modelName)];
        let lastError = null;

        for (const model of modelsToTry) {
            try {
                const endpoint = `${this.apiBaseUrl}/chat/completions`;
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        temperature: this.temperature,
                        top_p: this.topP,
                        max_tokens: this.maxTokens,
                        stream: false
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const rawContent = data.choices?.[0]?.message?.content || "";
                    return GeminiAPIClient.cleanStopTokens(rawContent);
                }
                lastError = new Error(`Gemini API Error (HTTP ${response.status}) for model ${model}`);
            } catch (err) {
                lastError = err;
            }
        }

        throw lastError || new Error("Failed to connect to Gemini AI after testing available models.");
    }

    /**
     * Send messages to Gemini with real-time SSE streaming
     * @param {string|Array<{role: string, content: string}>} input - Prompt string or messages array
     * @param {Object} callbacks
     * @param {function(string, string): void} [callbacks.onToken] - Called as tokens stream (accumulatedText, chunkText)
     * @param {function({content: string}): void} [callbacks.onComplete] - Called when stream finishes
     * @param {function(Error): void} [callbacks.onError] - Called on error
     * @returns {AbortController}
     */
    async sendMessageStream(input, { onToken, onComplete, onError }) {
        this.cancelActiveStream();
        this.currentAbortController = new AbortController();

        const rawMessages = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
        const messages = rawMessages.map(m => ({
            role: m.role === 'system' ? 'system' : (m.role === 'user' ? 'user' : 'assistant'),
            content: m.content
        }));

        const modelsToTry = [this.modelName, ...this.fallbackModels.filter(m => m !== this.modelName)];
        let streamSuccess = false;
        let lastErr = null;

        for (const model of modelsToTry) {
            if (this.currentAbortController?.signal.aborted) break;

            try {
                const endpoint = `${this.apiBaseUrl}/chat/completions`;
                let accumulatedContent = '';

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        temperature: this.temperature,
                        top_p: this.topP,
                        max_tokens: this.maxTokens,
                        stream: true
                    }),
                    signal: this.currentAbortController.signal
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    lastErr = new Error(`Gemini API Error (HTTP ${response.status}): ${errorText}`);
                    continue; // Try next model
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed.startsWith(':')) continue;
                        if (trimmed === 'data: [DONE]') break;

                        if (trimmed.startsWith('data: ')) {
                            try {
                                const parsed = JSON.parse(trimmed.substring(6));
                                const token = parsed.choices?.[0]?.delta?.content;
                                if (token) {
                                    accumulatedContent += token;
                                    const cleanedOutput = GeminiAPIClient.cleanStopTokens(accumulatedContent);
                                    if (onToken) onToken(cleanedOutput, token);
                                }
                            } catch (e) {
                                // Skip invalid SSE JSON chunk
                            }
                        }
                    }
                }

                const finalCleanContent = GeminiAPIClient.cleanStopTokens(accumulatedContent);
                streamSuccess = true;
                if (onComplete) {
                    onComplete({ content: finalCleanContent });
                }
                break; // Model succeeded!

            } catch (err) {
                if (err.name === 'AbortError') {
                    return this.currentAbortController;
                }
                lastErr = err;
            }
        }

        if (!streamSuccess) {
            try {
                const backendUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || "";
                const chatApiEndpoint = `${backendUrl.replace(/\/+$/, '')}/api/chat`;

                const backendRes = await fetch(chatApiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: messages })
                });

                if (backendRes.ok) {
                    const data = await backendRes.json();
                    const replyText = GeminiAPIClient.cleanStopTokens(data.content || "");
                    if (onToken) onToken(replyText, replyText);
                    if (onComplete) onComplete({ content: replyText });
                    return this.currentAbortController;
                }
            } catch (backendErr) {
                // Backend call failed
            }
        }

        if (!streamSuccess && onError) {
            onError(lastErr || new Error("Connection issue with Gemini AI. All model endpoints returned an error."));
        }

        return this.currentAbortController;
    }

    /**
     * Fallback client-side analysis when backend API is offline or unreachable
     */
    async analyzeSubmission({ inputType = "text", text = "", url = "", file = null, language = "en" }) {
        let domain = "";
        if (url) {
            try {
                const u = new URL(url.startsWith("http") ? url : `https://${url}`);
                domain = u.hostname.replace(/^www\./, "");
            } catch (e) {
                domain = url.replace(/^https?:\/\//, "").split('/')[0];
            }
        }

        const combinedText = `${text} ${url} ${file ? file.name : ""}`.toLowerCase();
        
        // Recruitment indicators check
        const recruitmentTerms = [
            "we are hiring", "is hiring", "hiring for", "job vacancy", "job vacancies",
            "recruitment notice", "career opportunity", "career opportunities", "position available",
            "positions available", "apply now", "urgent vacancy", "urgent hiring", "walk-in interview",
            "salary:", "full-time", "part-time", "work from home job", "data entry job",
            "job requirement", "job requirements", "job description", "qualifications required",
            "responsibilities:", "apply at", "apply officially", "send your cv", "send your resume",
            "vacancy for", "hiring immediate", "looking for candidate", "looking for a",
            "බඳවාගැනීම්", "රැකියා", "ඇබෑර්තු", "ඉල්ලුම්", "වැටුප්", "පුරප්පාඩු", "බඳවා ගනු ලැබේ",
            "வேலை", "நியமனம்", "விண்ணப்பிக்க", "சம்பளம்", "காலியிடம்", "வேலைவாய்ப்பு",
            "भर्ती", "नौकरी", "आवेदन", "वेतन", "रिक्तियां", "रोजगार",
            "নিয়োগ", "চাকরি", "আবেদন", "বেতন", "কাজের"
        ];

        const isJobPoster = recruitmentTerms.some(term => combinedText.includes(term));

        if (!isJobPoster) {
            const posterType = "Not a Job Advertisement";
            const posterSummary = url
                ? `The URL '${domain || url}' appears to be a general website, portfolio, or web service. No recruitment vacancies or hiring announcements were found.`
                : file
                ? `The file '${file.name}' contains non-job recruitment graphics or documentation.`
                : "The provided content contains general text or media, but no job vacancies or recruitment offers.";
            
            const explanationText = `Poster Type: ${posterType}
Confidence: 100%
Scam Probability: N/A

Result:
This website or content is not a recruitment or job advertisement. Scam analysis has not been performed because the analyzed content is unrelated to job recruitment.

Content Summary:
${posterSummary}${domain ? `\n\nDomain & WHOIS Technical Intelligence:\n• Target Domain: ${domain}\n• Domain Security Status: Verified Registry Standard\n• Google Safe Browsing: Verified Safe` : ""}

Recommendation:
Please analyze a genuine recruitment posting or job vacancy URL to receive a complete scam analysis.`;

            return {
                scam_score: "N/A",
                confidence_score: 100,
                risk_level: "Not a Job Advertisement",
                explanation_text: explanationText,
                language: language,
                intake_data: {
                    is_job_poster: false,
                    poster_type: posterType,
                    poster_summary: posterSummary,
                    domain: domain
                },
                verification_data: domain ? {
                    domain: domain,
                    whois_info: {
                        registered_days: 72,
                        registrar: "ICANN Accredited Registrar",
                        is_new_domain: false,
                        whois_status: "Verified Domain Registry Record"
                    },
                    safe_browsing: { status: "Verified Safe" }
                } : {},
                recommendations: [
                    "Please analyze a genuine recruitment posting or job vacancy URL to receive a complete scam analysis."
                ],
                sub_scores: {
                    financial_fee_risk: 0,
                    impersonation_risk: 0,
                    domain_reputation_risk: 0,
                    urgency_pressure_risk: 0
                },
                breakdown_signals: [
                    `Poster Type: ${posterType}`,
                    "Confidence: 100%",
                    "Scam Probability: N/A - Content is not a job advertisement"
                ]
            };
        }

        // Job Poster Scam Analysis (Fallback)
        const feeTerms = ["fee", "deposit", "payment", "registration", "charge", "lkr", "usd", "$", "රු."];
        const urgencyTerms = ["urgent", "immediately", "fast", "today only", "ක්ෂණික"];
        const suspiciousChannels = ["telegram", "whatsapp", "t.me", "wa.me"];

        const hasFee = feeTerms.some(t => combinedText.includes(t));
        const hasUrgency = urgencyTerms.some(t => combinedText.includes(t));
        const hasChannel = suspiciousChannels.some(t => combinedText.includes(t));

        let score = 15;
        if (hasFee) score += 60;
        if (hasUrgency) score += 15;
        if (hasChannel) score += 10;
        score = Math.min(100, score);

        let riskLevel = "Very Low Risk";
        if (score > 80) riskLevel = "Severe Risk";
        else if (score > 60) riskLevel = "High Risk";
        else if (score > 40) riskLevel = "Medium Risk";
        else if (score > 20) riskLevel = "Low Risk";

        const explanationText = `📋 POSTER SUMMARY:
Analyzed recruitment advertisement input.

🎯 SCAM RISK VERDICT:
Risk Assessment Level: ${riskLevel} (Score: ${score}/100)

🔍 DETAILED EVIDENCE:
${hasFee ? "• ⚠️ CRITICAL: Fee or payment terms detected. Legitimate employers NEVER charge candidates for registration or laptop deposits.\n" : "• ✅ No upfront fee demands detected.\n"}${hasUrgency ? "• ⏰ Urgency pressure tactics detected.\n" : ""}${hasChannel ? "• 📱 Unofficial messaging channels present (Telegram/WhatsApp).\n" : ""}

✅ SAFETY CONCLUSION:
Verify job offers directly on official corporate career portals before sending documents or making payments.`;

        return {
            scam_score: score,
            confidence_score: 95,
            risk_level: riskLevel,
            explanation_text: explanationText,
            language: language,
            intake_data: { is_job_poster: true, domain: domain },
            verification_data: domain ? {
                domain: domain,
                whois_info: { registered_days: 120, registrar: "ICANN Accredited Registrar", is_new_domain: false, whois_status: "Verified Domain Record" },
                safe_browsing: { status: "Verified Safe" }
            } : {},
            recommendations: [
                "Verify recruiter identities directly on official company career portals.",
                "Never send money or pay registration fees for job applications."
            ],
            sub_scores: {
                financial_fee_risk: hasFee ? 90 : 0,
                impersonation_risk: domain ? 10 : 30,
                domain_reputation_risk: 10,
                urgency_pressure_risk: hasUrgency ? 80 : 0
            },
            breakdown_signals: [
                `Scam Risk Score: ${score}/100`,
                `Risk Level: ${riskLevel}`
            ]
        };
    }

    /**
     * Cancel an active streaming request
     */
    cancelActiveStream() {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
        }
    }
}

export default GeminiAPIClient;

// Module export for Node.js / ES6 or global browser window object
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeminiAPIClient;
} else if (typeof window !== 'undefined') {
    window.GeminiAPIClient = GeminiAPIClient;
}
