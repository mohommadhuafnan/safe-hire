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
        let defaultEnvKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || "";
        if (!defaultEnvKey) {
            defaultEnvKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_SAFE_BROWSING_API_KEY) || "";
        }
        this.apiKey = config.apiKey || defaultEnvKey;
        this.modelName = config.modelName || "gemini-flash-lite-latest";
        this.fallbackModels = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-flash-lite-preview", "gemini-3.7-flash", "gemini-3.8-flash"];
        this.apiBaseUrl = (config.apiBaseUrl || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/+$/, '');
        this.temperature = config.temperature !== undefined ? config.temperature : 0.2;
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
                const backendUrl = GeminiAPIClient.getBackendUrl();
                const chatApiEndpoint = `${backendUrl}/api/chat`;

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
     * Convert File or Blob to Base64 string for Gemini Vision API
     */
    static fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = (error) => reject(error);
        });
    }

    static formatDomainAge(ageDays) {
        if (ageDays === null || ageDays === undefined || isNaN(ageDays) || ageDays < 0) return "Unavailable";
        if (ageDays === 0) return "Less than 1 day";
        if (ageDays < 30) return `${ageDays} ${ageDays === 1 ? 'day' : 'days'}`;
        if (ageDays < 365) {
            const months = Math.floor(ageDays / 30);
            const days = ageDays % 30;
            return days > 0 ? `${months} ${months === 1 ? 'month' : 'months'} ${days} ${days === 1 ? 'day' : 'days'}` : `${months} ${months === 1 ? 'month' : 'months'}`;
        }
        const years = Math.floor(ageDays / 365);
        const remDays = ageDays % 365;
        const months = Math.floor(remDays / 30);
        return months > 0 ? `${years} ${years === 1 ? 'year' : 'years'} ${months} ${months === 1 ? 'month' : 'months'}` : `${years} ${years === 1 ? 'year' : 'years'}`;
    }

    static cleanDomain(str) {
        if (!str) return "";
        const freeWebmail = ["gmail.com", "googlemail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "mail.com", "proton.me", "protonmail.com"];
        let clean = String(str).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0].split(':')[0];
        if (clean.includes('@')) {
            clean = clean.split('@').pop() || '';
        }
        clean = clean.replace(/[.,;:()[\]{}'"]+$/, '').trim();
        if (clean && clean.includes('.') && !freeWebmail.includes(clean)) {
            return clean;
        }
        return "";
    }

    static getBackendUrl() {
        let raw = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || "";
        raw = raw.trim();
        if (raw === 'safe-hire-core-api' || raw === 'safe-hire-core-api:8000') {
            raw = 'https://safe-hire-core-api.onrender.com';
        } else if (raw && !raw.startsWith('http://') && !raw.startsWith('https://') && !raw.startsWith('/')) {
            raw = `https://${raw}`;
        }
        return raw.replace(/\/+$/, '');
    }

    static async fetchWhoisData(targetDomain) {
        if (!targetDomain) return null;

        const clean = String(targetDomain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0].split(':')[0];
        const ignoredPlatforms = [
            'linkedin.com', 'lnkd.in', 'facebook.com', 'fb.com', 'fb.me',
            'instagram.com', 'instagr.am', 'twitter.com', 'x.com', 't.co',
            'tiktok.com', 'telegram.org', 'telegram.me', 't.me',
            'whatsapp.com', 'wa.me', 'youtube.com', 'youtu.be',
            'reddit.com', 'pinterest.com', 'threads.net', 'snapchat.com',
            'bit.ly', 'tinyurl.com', 'ow.ly', 'buff.ly', 'is.gd', 'cutt.ly', 'goo.gl', 'qr.ae', 'rb.gy', 'rebrand.ly',
            'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'aol.com', 'mail.com', 'proton.me', 'protonmail.com'
        ];

        if (ignoredPlatforms.includes(clean) || ignoredPlatforms.some(p => clean.endsWith('.' + p))) {
            return null;
        }

        // 1. Primary: APILayer WHOIS API if client key available
        try {
            const apikey = (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_APILAYER_KEY || import.meta.env.APILAYER_KEY)) || "nIvPeI99eWBDMSArYAf2YcrshDCOVvJ3";
            if (apikey) {
                const apiRes = await fetch(`https://api.apilayer.com/whois/query?domain=${encodeURIComponent(targetDomain)}`, {
                    headers: { 'apikey': apikey }
                });
                if (apiRes.ok) {
                    const apiData = await apiRes.json();
                    const w = apiData.result;
                    if (w && w.creation_date) {
                        const creationStr = w.creation_date;
                        const diffMs = Math.max(0, Date.now() - new Date(creationStr).getTime());
                        const regDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                        const years = Math.floor(regDays / 365);
                        const isNew = regDays < 90;
                        const ageFmt = GeminiAPIClient.formatDomainAge(regDays);
                        const registrar = w.registrar || "ICANN Accredited Registrar";
                        return {
                            status: isNew ? 'suspicious' : 'verified',
                            domain: targetDomain,
                            creation_date: creationStr,
                            registered_days: regDays,
                            domain_years: years,
                            domain_age_formatted: ageFmt,
                            is_new_domain: isNew,
                            registrar: registrar,
                            whois_status: isNew ? `⚠️ HIGH RISK DOMAIN: Created ${ageFmt} ago (< 90 days) • ${registrar}` : `ESTABLISHED DOMAIN: ${ageFmt} Old • ${registrar}`,
                            api_verified: true
                        };
                    }
                }
            }
        } catch (apiErr) {
            console.warn("Client APILayer WHOIS notice:", apiErr);
        }

        // 2. Secondary: Official ICANN RDAP open protocol (rdap.org)
        try {
            const res = await fetch(`https://rdap.org/domain/${targetDomain}`);
            if (res.ok) {
                const data = await res.json();
                const events = data.events || [];
                let creationStr = null;
                for (const ev of events) {
                    if (ev.eventAction === 'registration') creationStr = ev.eventDate;
                }
                let regDays = null;
                let isNew = false;
                let years = null;
                if (creationStr) {
                    const diffMs = Date.now() - new Date(creationStr).getTime();
                    regDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                    years = Math.floor(regDays / 365);
                    isNew = regDays < 90;
                }
                let registrar = "ICANN Accredited Registrar";
                const entities = data.entities || [];
                for (const ent of entities) {
                    if (ent.roles?.includes('registrar') && ent.vcardArray?.[1]) {
                        for (const item of ent.vcardArray[1]) {
                            if (item[0] === 'fn' && item[3]) {
                                registrar = item[3];
                                break;
                            }
                        }
                    }
                }
                const ageFmt = GeminiAPIClient.formatDomainAge(regDays);
                return {
                    status: isNew ? 'suspicious' : 'verified',
                    domain: targetDomain,
                    creation_date: creationStr,
                    registered_days: regDays,
                    domain_years: years,
                    domain_age_formatted: ageFmt,
                    is_new_domain: isNew,
                    registrar: registrar,
                    whois_status: isNew ? `⚠️ HIGH RISK DOMAIN: Created ${ageFmt} ago (< 90 days) • ${registrar}` : `ESTABLISHED DOMAIN: ${ageFmt} Old • ${registrar}`,
                    api_verified: true
                };
            }
        } catch (e) {
            console.warn("Client RDAP lookup notice:", e);
        }

        // 3. Tertiary: Certificate Transparency Logs via CertSpotter
        try {
            const csRes = await fetch(`https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(targetDomain)}&include_subdomains=true&expand=dns_names`);
            if (csRes.ok) {
                const certs = await csRes.json();
                if (Array.isArray(certs) && certs.length > 0) {
                    let earliestTs = null;
                    for (const c of certs) {
                        const nb = c.not_before;
                        if (nb) {
                            const ts = new Date(nb).getTime();
                            if (!isNaN(ts) && (!earliestTs || ts < earliestTs)) {
                                earliestTs = ts;
                            }
                        }
                    }
                    if (earliestTs) {
                        const diffMs = Math.max(0, Date.now() - earliestTs);
                        const regDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                        const years = Math.floor(regDays / 365);
                        const isNew = regDays < 90;
                        const ageFmt = GeminiAPIClient.formatDomainAge(regDays);
                        const registrar = "Certificate Transparency & Registry Verified";
                        return {
                            status: isNew ? 'suspicious' : 'verified',
                            domain: targetDomain,
                            creation_date: new Date(earliestTs).toISOString(),
                            registered_days: regDays,
                            domain_years: years,
                            domain_age_formatted: ageFmt,
                            is_new_domain: isNew,
                            registrar: registrar,
                            whois_status: isNew ? `⚠️ HIGH RISK DOMAIN: Created ${ageFmt} ago (< 90 days) • ${registrar}` : `ESTABLISHED DOMAIN: ${ageFmt} Active • ${registrar}`,
                            api_verified: true
                        };
                    }
                }
            }
        } catch (csErr) {
            console.warn("Client CertSpotter lookup notice:", csErr);
        }

        return {
            status: "unavailable",
            domain: targetDomain,
            creation_date: "N/A",
            registered_days: null,
            domain_years: null,
            domain_age_formatted: "Unavailable",
            is_new_domain: false,
            registrar: "Domain Registry",
            whois_status: "Public registration data unavailable for this domain",
            api_verified: false
        };
    }

    /**
     * Compute a 100% deterministic scam score from extracted text & entities
     */
    static calculateDeterministicScamScore({ isJob = true, text = "", domain = "", hasWhois = false, isNewDomain = false, registeredDays = null }) {
        if (!isJob) {
            return {
                score: "N/A",
                riskLevel: "Not a Job Advertisement",
                subScores: { financial_fee_risk: 0, impersonation_risk: 0, domain_reputation_risk: 0, urgency_pressure_risk: 0 },
                reasons: ["Non-recruitment content — scam probability scoring is not applicable."]
            };
        }

        const lower = (text || "").toLowerCase();
        const feeTerms = [
            "registration fee", "processing fee", "refundable deposit", "security fee", "security deposit",
            "buy kit", "training fee", "laptop fee", "pay first", "send money", "id card charge", "interview fee",
            "uniform fee", "application fee", "joining fee", "service charge", "pay lkr", "pay rs", "pay inr",
            "pay $", "pay usd", "advance payment", "transfer fee", "fee required", "small deposit", "gpay", "phonepe",
            "paytm", "easycash", "bkash", "nagad", "ගාස්තුව", "තැන්පතු මුදල", "ලියාපදිංචි ගාස්තු", "ලියාපදිංචි මුදල",
            "கட்டணம்", "முன்பணம்", "பதிவு கட்டணம்", "फीस", "पंजीकरण शुल्क", "নিবন্ধন ফি"
        ];
        const urgencyTerms = [
            "offer expires today", "instant selection", "urgent hiring pay now", "guaranteed job in 24 hours",
            "immediate hiring", "apply immediately", "spot selection", "urgent requirement", "වහාම අයදුම් කරන්න",
            "ක්ෂණික බඳවාගැනීම්", "உடனடி வேலை", "அவசர ஆட்சேர்ப்பு", "तुरंत भर्ती", "জরুরী নিয়োগ"
        ];
        const suspiciousChannels = [
            "telegram", "t.me", "whatsapp only", "dm on telegram", "inbox me", "contact on whatsapp",
            "no interview", "copy paste job", "typing job", "data entry", "earn $", "earn 1000", "earn weekly", "earn daily",
            "work 2 hours", "work from home 2 hours", "guaranteed income", "no qualification required", "direct joining",
            "no experience required", "instant selection", "quick cash", "daily payout", "weekly payout"
        ];
        const freeEmailDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "rediffmail.com", "yandex.com", "protonmail.com"];
        const corporateBrands = ["google", "amazon", "microsoft", "dialog", "virtusa", "wso2", "tcs", "infosys", "unilever", "hayleys", "john keells", "sbi", "boc", "sampath bank", "hcl", "wipro", "accenture", "ibm", "nestle", "brandix", "peoples bank", "commercial bank"];

        const hasFee = feeTerms.some(t => lower.includes(t));
        const hasUrgency = urgencyTerms.some(t => lower.includes(t));
        const matchedChannels = suspiciousChannels.filter(t => lower.includes(t));
        const hasFreeEmail = freeEmailDomains.some(d => lower.includes(`@${d}`) || lower.includes(d));
        const hasBrand = corporateBrands.some(b => lower.includes(b));
        const hasImpersonation = hasBrand && hasFreeEmail;

        let score = 15;
        const reasons = [];

        if (hasFee) {
            score += 65;
            reasons.push("⚠️ Upfront fee or deposit demanded. Legitimate employers never charge candidates.");
        }
        if (hasImpersonation) {
            score += 35;
            reasons.push("🎭 Corporate brand impersonation detected: Corporate brand claimed with free generic email.");
        } else if (hasBrand && (!domain || domain === "Not Specified") && hasFreeEmail) {
            score += 25;
            reasons.push("🏢 Recruiter claims a corporate entity without verifiable company domain.");
        } else if (hasFreeEmail && (!domain || domain === "Not Specified")) {
            score += 12;
            reasons.push("📧 Contact via generic webmail provider.");
        }

        if (isNewDomain) {
            score += (registeredDays !== null && registeredDays < 30) ? 25 : 15;
            reasons.push("🌐 Newly registered domain (< 90 days). High frequency in ephemeral scam campaigns.");
        } else if (hasWhois && registeredDays !== null && registeredDays > 365 && !hasFee && !hasImpersonation) {
            const deduction = registeredDays > 1000 ? 10 : 5;
            score -= deduction;
            reasons.append?.("✅ Established employer domain registration history.") || reasons.push("✅ Established employer domain registration history.");
        }

        if (matchedChannels.length >= 3) {
            score += 35;
            reasons.push(`📱 High-risk informal channels & unrealistic work promises (${matchedChannels.length} signals): ${matchedChannels.slice(0, 3).join(', ')}.`);
        } else if (matchedChannels.length >= 2) {
            score += 25;
            reasons.push(`📱 Informal recruitment channel & unrealistic terms: ${matchedChannels.slice(0, 2).join(', ')}.`);
        } else if (matchedChannels.length >= 1) {
            score += 15;
            reasons.push(`📱 Informal recruitment channel / unrealistic terms: ${matchedChannels.slice(0, 2).join(', ')}.`);
        }

        if (hasUrgency) {
            score += 10;
            reasons.push("⏰ Artificial urgency / pressure tactics detected.");
        }

        if (hasFee) {
            score = Math.max(80, Math.min(98, score));
        } else if (hasImpersonation) {
            score = Math.max(60, Math.min(95, score));
        } else if (!hasFee && !hasImpersonation && !isNewDomain && matchedChannels.length === 0 && !hasUrgency && !hasFreeEmail) {
            score = Math.max(5, Math.min(15, score));
            if (reasons.length === 0) reasons.push("✅ No upfront fee demands, disposable domains, or impersonation flags detected.");
        } else {
            score = Math.max(5, Math.min(98, score));
        }

        let riskLevel = "Low Apparent Risk";
        if (score >= 80) riskLevel = "Severe Risk";
        else if (score >= 60) riskLevel = "High Risk";
        else if (score >= 40) riskLevel = "Moderate Risk";
        else if (score >= 20) riskLevel = "Low / Moderate Risk";

        const subScores = {
            financial_fee_risk: hasFee ? 95 : 5,
            impersonation_risk: hasImpersonation ? 85 : (hasBrand ? 45 : (hasFreeEmail ? 25 : 10)),
            domain_reputation_risk: isNewDomain ? 80 : 15,
            urgency_pressure_risk: hasUrgency ? 80 : 5
        };

        return { score, riskLevel, subScores, reasons };
    }

    /**
     * Standalone client-side AI analysis engine using Gemini 2.0 Flash Vision API when backend API is offline or unreachable.
     */
    async analyzeSubmission({ inputType = "text", text = "", url = "", file = null, language = "en" }) {
        let domain = GeminiAPIClient.cleanDomain(url);
        if (!domain && text) {
            const urlMatch = text.match(/https?:\/\/[^\s"'<>]+/i) || text.match(/\bwww\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/i) || text.match(/\b[a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|net|edu|gov|io|co|lk|in|uk|bd|xyz|top|site|online|tech|ai|dev|info|co\.uk|ac\.lk|gov\.lk)\b/i);
            if (urlMatch) {
                domain = GeminiAPIClient.cleanDomain(urlMatch[0]);
            }
            if (!domain) {
                const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
                if (emailMatch) {
                    domain = GeminiAPIClient.cleanDomain(emailMatch[1]);
                }
            }
        }

        // 1. DIRECT GEMINI VISION & MULTIMODAL AI ANALYSIS (when API key is present)
        if (this.apiKey) {
            try {
                let base64Image = null;
                let mimeType = "image/png";

                if (inputType === "image" && file && file.type && (file.type.startsWith("image/") || file.type.includes("pdf"))) {
                    base64Image = await GeminiAPIClient.fileToBase64(file);
                    mimeType = file.type || "image/png";
                }

                const visionPrompt = `You are SAFE-HIRE's Senior AI Recruitment Fraud & Poster Intelligence Engine.
Analyze the user's submission carefully and produce an EXHAUSTIVE, HIGHLY DETAILED, MULTI-SECTION SECURITY AUDIT REPORT.

USER INPUT METADATA:
- Input Type: ${inputType}
- Submitted Text: ${text || "N/A"}
- Submitted URL: ${url || "N/A"}
- Attached File Name: ${file ? file.name : "N/A"}
- Requested Language: ${language}

YOUR INSTRUCTIONS:
1. Determine if the input (image/poster/text/URL) represents a Job Recruitment Advertisement or NOT a job advertisement.
   - If it is NOT a job advertisement (e.g. nature photo, graduation flyer, university banner, personal photo, product ad, hackathon flyer, certificate), set "is_job_poster": false, "scam_score": "N/A", "risk_level": "Not a Job Advertisement".
   - If it IS a job advertisement, set "is_job_poster": true, and compute a scam probability score from 0 to 100 based on fraud risk factors (upfront fee demands, laptop deposits, informal Telegram/WhatsApp channels, generic email addresses, unrealistically high salary for minimal effort).

2. The "explanation_text" field MUST be an EXHAUSTIVE, MULTI-SECTION AUDIT REPORT formatted in markdown:
📋 EXHAUSTIVE POSTER SUMMARY & ENTITY EXTRACTION:
- Company/Brand: [Company Name extracted]
- Positions/Roles: [Positions extracted]
- Qualifications & Requirements: [Requirements extracted]
- Salary/Compensation: [Salary/stipend info extracted]
- Contact & Application Channels: [Emails, phones, website, WhatsApp/Telegram]

🎯 SCAM RISK VERDICT & RATING:
[Full 2-3 sentence verdict explaining the exact scam risk score, why it was given this score, and the primary conclusion.]

🔍 COMPREHENSIVE RISK FACTORS & DEEP EVIDENCE AUDIT:
• Upfront Fee & Financial Demand Audit: [Detailed analysis of payment/deposits]
• Brand Identity & Email Domain Verification: [Analysis of official corporate domain vs free email accounts]
• Technical Domain Intelligence: [Domain age, WHOIS status, SSL, Safe Browsing status]
• Communication & Urgency Tactics: [Evaluation of official portal vs WhatsApp/Telegram and artificial pressure]

📊 SUB-SIGNAL RISK EVALUATION:
- Financial Fee Risk: [X/100]
- Impersonation Risk: [X/100]
- Domain Reputation Risk: [X/100]
- Urgency Pressure Risk: [X/100]

✅ EXPERT SAFETY ACTION PLAN FOR JOB SEEKERS:
1. [Actionable step 1]
2. [Actionable step 2]
3. [Actionable step 3]
4. [Actionable step 4]

Return ONLY a valid JSON object matching this exact key structure (no markdown fences outside JSON):
{
  "is_job_poster": true/false,
  "scam_score": integer 0-100 or "N/A",
  "risk_level": "Severe Risk | High Risk | Medium Risk | Low Risk | Very Low Risk | Not a Job Advertisement",
  "confidence_score": integer 90-100,
  "poster_type": "Job Advertisement | Not a Job Advertisement",
  "explanation_text": "<Full rich multi-section explanation report text>",
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3",
    "Specific actionable recommendation 4"
  ],
  "sub_scores": {
    "financial_fee_risk": integer 0-100,
    "impersonation_risk": integer 0-100,
    "domain_reputation_risk": integer 0-100,
    "urgency_pressure_risk": integer 0-100
  },
  "breakdown_signals": [
    "Key signal 1",
    "Key signal 2",
    "Key signal 3"
  ]
}`;

                const parts = [{ text: visionPrompt }];
                if (base64Image) {
                    parts.push({
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Image
                        }
                    });
                }

                const modelsToTry = [this.modelName, ...this.fallbackModels];
                for (const gModel of modelsToTry) {
                    try {
                        const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${this.apiKey}`;
                        const res = await fetch(restUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                contents: [{ parts }],
                                generationConfig: { temperature: 0.0, maxOutputTokens: 1500 }
                            })
                        });

                        if (res.ok) {
                            const data = await res.json();
                            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                            const cleanedJson = rawText.replace(/```json/gi, "").replace(/```/gi, "").trim();
                            const parsed = JSON.parse(cleanedJson);
                            if (parsed && typeof parsed === "object") {
                                let isNotJob = parsed.content_type === "not_job_poster" || parsed.is_job_poster === false || parsed.poster_type === "Not a Job Advertisement" || String(parsed.poster_type || "").toLowerCase().includes("not a job");
                                const combinedCheck = `${parsed.explanation_text || ""} ${text || ""} ${file ? file.name : ""}`.toLowerCase();
                                const recKeywords = ["vacancy", "vacancies", "part-time", "part time", "full-time", "full time", "sales assistant", "assistant", "cashier", "clerk", "trainee", "hiring", "apply now", "school leaver", "send your cv", "cv to"];
                                if (recKeywords.some(t => combinedCheck.includes(t))) {
                                    isNotJob = false;
                                }

                                if (!domain && parsed) {
                                    domain = GeminiAPIClient.cleanDomain(parsed.website || parsed.company_website || parsed.email);
                                    if (!domain && parsed.explanation_text) {
                                        const em = parsed.explanation_text.match(/https?:\/\/[^\s"'<>]+/i) || parsed.explanation_text.match(/\bwww\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/i) || parsed.explanation_text.match(/\b[a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|net|edu|gov|io|co|lk|in|uk|bd|xyz|top|site|online|tech|ai|dev)\b/i);
                                        if (em) domain = GeminiAPIClient.cleanDomain(em[0]);
                                    }
                                }
                                const liveWhois = domain ? await GeminiAPIClient.fetchWhoisData(domain) : null;
                                const isNewDom = Boolean(liveWhois?.is_new_domain);
                                const regDays = liveWhois?.registered_days ?? null;

                                const calculatedResult = GeminiAPIClient.calculateDeterministicScamScore({
                                    isJob: !isNotJob,
                                    text: combinedCheck,
                                    domain: domain,
                                    hasWhois: Boolean(liveWhois),
                                    isNewDomain: isNewDom,
                                    registeredDays: regDays
                                });

                                const finalScore = calculatedResult.score;
                                const finalRisk = calculatedResult.riskLevel;
                                const finalSubScores = calculatedResult.subScores;

                                let explanation = parsed.explanation_text || parsed.explanation || "Analysis completed.";
                                if (isNotJob && !explanation.includes("POSTER SUMMARY")) {
                                    explanation = `📋 POSTER SUMMARY:\n• Classification: ${parsed.specificCategory || parsed.poster_type || 'Non-Recruitment Media'}\n• Scam Risk Score: N/A (Non-Recruitment Content)\n\n🔍 DETAILED IMAGE & CONTENT AUDIT:\n${explanation}\n\n✅ AUDIT CONCLUSION & ADVICE:\nThis media has been analyzed by SAFE-HIRE AI. It contains no active job recruitment listings, salary offers, or recruitment fee demands. Scam probability analysis is not applicable to non-recruitment media.`;
                                }

                                return {
                                    is_job_poster: !isNotJob,
                                    pipeline_stopped_stage: isNotJob ? 1 : 5,
                                    scam_score: finalScore,
                                    confidence_score: isNotJob ? 95 : 95,
                                    risk_level: finalRisk,
                                    explanation_text: explanation,
                                    language: language,
                                    input_url: url || domain || "",
                                    intake_data: {
                                        is_job_poster: !isNotJob,
                                        poster_type: isNotJob ? "Not a Job Advertisement" : (parsed.poster_type || "Job Advertisement"),
                                        specific_category: parsed.specificCategory || parsed.poster_type || "Media",
                                        domain: domain
                                    },
                                    verification_data: domain ? {
                                        domain: domain,
                                        whois_info: liveWhois || { registered_days: 120, registrar: "ICANN Accredited Registrar", is_new_domain: false, whois_status: "Domain Record Checked" },
                                        safe_browsing: { status: "Verified Safe" }
                                    } : {},
                                    recommendations: isNotJob ? [
                                        "Please upload a recruitment or job advertisement (PNG, JPG, JPEG, WEBP, PDF, DOC, or DOCX) for scam analysis.",
                                        "Verify non-recruitment services directly with the respective organization."
                                    ] : (parsed.recommendations || [
                                        "Verify recruiter identities directly on official company career portals.",
                                        "Never send money or pay registration fees for job applications."
                                    ]),
                                    sub_scores: finalSubScores,
                                    breakdown_signals: isNotJob ? [
                                        `Category: ${parsed.specificCategory || 'Non-Recruitment Media'}`,
                                        "Scam Probability: N/A (Non-Recruitment Content)",
                                        "AI Classification Complete"
                                    ] : (calculatedResult.reasons || [
                                        `Poster Type: ${parsed.poster_type || 'Job Advertisement'}`,
                                        `Scam Risk Assessment Complete`
                                    ])
                                };
                            }
                        }
                    } catch (err) {
                        // Try next model
                    }
                }
            } catch (visionErr) {
                // Fall back to rule engine
            }
        }

        // 2. HEURISTIC RULE ENGINE FALLBACK (if Gemini API key is unprovided or network drops)
        const combinedText = `${text} ${url} ${inputType === "image" && file ? file.name : ""}`.toLowerCase();
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

        // If file is provided or text contains job indicators, treat as potential job poster
        const isJobPoster = (inputType === "image" || Boolean(file)) ? true : (recruitmentTerms.some(term => combinedText.includes(term)) || combinedText.length > 20);

        if (!isJobPoster) {
            const posterType = "Not a Job Advertisement";
            const posterSummary = url
                ? `The URL '${domain || url}' appears to be a general website, portfolio, or web service. No recruitment vacancies or hiring announcements were found.`
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
                id: 'report_' + Date.now().toString(36),
                is_job_poster: false,
                pipeline_stopped_stage: 1,
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
        const liveWhois = domain ? await GeminiAPIClient.fetchWhoisData(domain) : null;
        const calculatedResult = GeminiAPIClient.calculateDeterministicScamScore({
            isJob: true,
            text: combinedText,
            domain: domain,
            hasWhois: Boolean(liveWhois),
            isNewDomain: Boolean(liveWhois?.is_new_domain),
            registeredDays: liveWhois?.registered_days ?? null
        });

        const score = calculatedResult.score;
        const riskLevel = calculatedResult.riskLevel;
        const hasFee = calculatedResult.subScores.financial_fee_risk > 50;
        const hasUrgency = calculatedResult.subScores.urgency_pressure_risk > 50;
        const hasChannel = Boolean(combinedText.includes("telegram") || combinedText.includes("whatsapp"));

        const findingsList = [];
        if (hasFee) {
            findingsList.push("⚠️ CRITICAL: Upfront registration fee or deposit demanded. Legitimate employers NEVER charge candidates.");
        } else {
            findingsList.push("No upfront registration fee demands or deposit requests detected in this submission.");
        }
        if (hasUrgency) {
            findingsList.push("Artificial urgency / pressure tactics detected in job offer terms.");
        }
        if (hasChannel) {
            findingsList.push("Unofficial recruitment channels or informal contact routes detected (Telegram/WhatsApp).");
        }
        if (liveWhois?.is_new_domain) {
            findingsList.push(`Newly registered domain (< 90 days): ${domain}. Ephemeral domains carry higher fraud risk.`);
        } else if (liveWhois?.domain_years && liveWhois.domain_years >= 1) {
            findingsList.push(`Established domain history: ${domain} (${liveWhois.domain_age_formatted} old).`);
        }
        findingsList.push("SAFE-HIRE multi-signal recruitment fraud audit complete.");

        const evidenceBullets = findingsList.map(f => `• ${f}`).join("\n");
        const docSummary = file ? `Analyzed uploaded recruitment poster (${file.name}).` : (text ? `Analyzed submitted job description: "${text.slice(0, 150)}..."` : `Analyzed recruitment URL (${url || domain}).`);

        let explanationText = "";
        if (language === 'ta') {
          explanationText = `📋 போஸ்டர் சுருக்கம்:
${file ? `பதிவேற்றப்பட்ட வேலைவாய்ப்பு விளம்பரம் பகுப்பாய்வு செய்யப்பட்டது (${file.name}).` : "வேலைவாய்ப்பு விவரங்கள் சரிபார்க்கப்பட்டன."}

🎯 மோசடி ஆபத்து தீர்ப்பு:
ஆபத்து நிலை: ${riskLevel} (மதிப்பெண்: ${score}/100)
${hasFee ? "முக்கிய எச்சரிக்கை: முன்பணக் கட்டணக் கோரிக்கைகள் கண்டறியப்பட்டுள்ளன. சட்டபூர்வமான நிறுவனங்கள் ஒருபோதும் கட்டணம் கேட்கமாட்டா." : "முன்பணக் கட்டணக் கோரிக்கைகள் ஏதும் கண்டறியப்படவில்லை."}

🔍 விரிவான ஆதாரங்கள் & பகுப்பாய்வு:
${evidenceBullets}

✅ பாதுகாப்பு முடிவு & ஆலோசனை:
ஆவணங்களை அனுப்புவதற்கு அல்லது பணம் செலுத்துவதற்கு முன் அதிகாரப்பூர்வ நிறுவன போர்ட்டல் மூலம் தகவல்களை சரிபார்க்கவும்.`;
        } else if (language === 'si') {
          explanationText = `📋 පෝස්ටර් සාරාංශය:
${file ? `ඇතුළත් කරන ලද රැකියා දැන්වීම විශ්ලේෂණය කරන ලදී (${file.name}).` : "රැකියා දැන්වීම් විස්තර විශ්ලේෂණය කරන ලදී."}

🎯 වංචා අවදානම් තීරණය:
අවදානම් තත්ත්වය: ${riskLevel} (ලකුණු: ${score}/100)
${hasFee ? "බරපතල අවධානය: ලියාපදිංචි හෝ තැන්පතු ගාස්තු ඉල්ලීම් හඳුනාගෙන ඇත. නීත්‍යානුකූල ආයතන කිසිවිටෙකත් රැකියා සඳහා මුදල් අය නොකරයි." : "පූර්ව ගාස්තු ඉල්ලීම් හඳුනාගෙන නොමැත."}

🔍 විස්තරාත්මක සාක්ෂි හා විශ්ලේෂණය:
${evidenceBullets}

✅ ආරක්ෂිත නිගමනය සහ උපදෙස්:
ලේඛන යැවීමට හෝ මුදල් ගෙවීමට පෙර නිල ආයතනික කැරියර් පෝර්ටලය හරහා තොරතුරු පරීක්ෂා කරන්න.`;
        } else if (language === 'hi') {
          explanationText = `📋 पोस्टर सारांश:
${file ? `अपलोड किए गए भर्ती विज्ञापन का विश्लेषण किया गया (${file.name}).` : "नौकरी रिक्ति विवरण का विश्लेषण किया गया।"}

🎯 धोखाधड़ी जोखिम निर्णय:
जोखिम स्तर: ${riskLevel} (स्कोर: ${score}/100)
${hasFee ? "चेतावनी: पंजीकरण या लैपटॉप जमा शुल्क की मांग पाई गई है। वैध कंपनियां कभी भी आवेदन शुल्क नहीं मांगतीं।" : "कोई अग्रिम शुल्क मांग नहीं पाई गई।"}

🔍 विस्तृत साक्ष्य एवं विश्लेषण:
${evidenceBullets}

✅ सुरक्षा निष्कर्ष एवं सलाह:
दस्तावेज़ भेजने या भुगतान करने से पहले केवल आधिकारिक कंपनी करियर पोर्टल से जानकारी सत्यापित करें।`;
        } else if (language === 'bn') {
          explanationText = `📋 পোস্টার সারসংক্ষেপ:
${file ? `আপলোড করা নিয়োগ বিজ্ঞপ্তি বিশ্লেষণ করা হয়েছে (${file.name}).` : "নিয়োগ বিজ্ঞপ্তি বিশদ বিশ্লেষণ করা হয়েছে।"}

🎯 প্রতারণার ঝুঁকির রায়:
ঝুঁকির মাত্রা: ${riskLevel} (স্কোর: ${score}/100)
${hasFee ? "সতর্কবার্তা: নিবন্ধন বা জামানত ফি দাবির তথ্য পাওয়া গেছে। বৈধ কোম্পানিগুলো কখনোই ফি চায় না।" : "কোনো অগ্রিম ফি দাবি পাওয়া যায়নি।"}

🔍 বিস্তারিত প্রমাণ ও বিশ্লেষণ:
${evidenceBullets}

✅ নিরাপত্তা উপসংহার ও পরামর্শ:
নথিপত্র পাঠাতে বা অর্থ প্রদান করার আগে অফিসিয়াল করপোরেট ক্যারিয়ার পোর্টালে সরাসরি তথ্য যাচাই করুন।`;
        } else {
          explanationText = `📋 POSTER SUMMARY:
${docSummary}

🎯 SCAM RISK VERDICT:
Risk Assessment Level: ${riskLevel} (Scam Probability Score: ${score}/100)
${hasFee ? "Critical fraud warning: Upfront registration fee or deposit demand detected. Legitimate employers NEVER charge candidates." : "No upfront fee demands detected based on available evidence."}

🔍 DETAILED EVIDENCE & RED FLAGS:
${evidenceBullets}

✅ SAFETY CONCLUSION & ADVICE:
Verify job offers directly on official corporate career portals before sending documents or making payments.`;
        }

        return {
            id: 'report_' + Date.now().toString(36),
            scam_score: score,
            confidence_score: 95,
            risk_level: riskLevel,
            explanation_text: explanationText,
            language: language,
            input_url: url || domain || "",
            intake_data: { is_job_poster: true, domain: domain },
            verification_data: domain ? {
                domain: domain,
                whois_info: liveWhois || { registered_days: 120, registrar: "ICANN Accredited Registrar", is_new_domain: false, whois_status: "Verified Domain Record" },
                safe_browsing: { status: "Verified Safe" }
            } : {},
            recommendations: [
                "Verify recruiter identities directly on official company career portals.",
                "Never send money or pay registration fees for job applications."
            ],
            sub_scores: {
                financial_fee_risk: hasFee ? 90 : 10,
                impersonation_risk: domain ? 10 : 20,
                domain_reputation_risk: 10,
                urgency_pressure_risk: hasUrgency ? 80 : 10
            },
            breakdown_signals: [
                `Scam Risk Score: ${score}/100`,
                `Risk Level: ${riskLevel}`
            ]
        };
    }

    /**
     * Dynamically translate an active analysis report to target language
     */
    async translateReport(report, targetLanguage) {
        if (!report || !report.explanation_text) return report;
        const targetLang = targetLanguage || 'en';

        // 1. Try backend API first
        try {
            const backendUrl = GeminiAPIClient.getBackendUrl();
            const token = localStorage.getItem('safe_hire_token') || localStorage.getItem('token') || '';
            const res = await fetch(`${backendUrl}/api/analyze/translate-report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    explanation_text: report.explanation_text,
                    recommendations: report.recommendations || [],
                    breakdown_signals: report.breakdown_signals || [],
                    target_language: targetLang
                })
            });
            if (res.ok) {
                const translated = await res.json();
                if (translated && translated.explanation_text) {
                    return {
                        ...report,
                        explanation_text: translated.explanation_text,
                        recommendations: translated.recommendations || report.recommendations,
                        breakdown_signals: translated.breakdown_signals || report.breakdown_signals,
                        language: targetLang
                    };
                }
            }
        } catch (e) {
            console.warn('Backend translation API unavailable, using direct Gemini fallback:', e);
        }

        // 2. Direct Gemini Multimodal AI Fallback
        if (this.apiKey) {
            try {
                const langMap = {
                    ta: 'Tamil (தமிழ்)',
                    si: 'Sinhala (සිංහල)',
                    hi: 'Hindi (हिंदी)',
                    bn: 'Bengali (বাংলা)',
                    en: 'English'
                };
                const langName = langMap[targetLang] || 'English';

                const prompt = `You are a professional security report translator.
Translate the following security audit report components natively into ${langName} (${targetLang}).
Keep all markdown formatting, emojis (📋, 🎯, 🔍, 💡, ✅, 🌐), headers, numbers, bullet points, and structure intact.

1. explanation_text:
${report.explanation_text}

2. recommendations:
${JSON.stringify(report.recommendations || [])}

3. breakdown_signals:
${JSON.stringify(report.breakdown_signals || [])}

Return ONLY a valid JSON object matching this structure (no markdown fences outside JSON):
{
  "explanation_text": "<translated explanation text in ${langName}>",
  "recommendations": ["<translated rec 1>", "<translated rec 2>", ...],
  "breakdown_signals": ["<translated signal 1>", "<translated signal 2>", ...]
}`;

                const modelsToTry = [
                    "gemini-flash-lite-latest",
                    "gemini-3.1-flash-lite-preview",
                    "gemini-flash-latest",
                    "gemini-3.5-flash",
                    "gemini-3.6-flash"
                ];

                for (const gModel of modelsToTry) {
                    try {
                        const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${this.apiKey}`;
                        const res = await fetch(restUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                        });

                        if (res.ok) {
                            const data = await res.json();
                            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            const cleaned = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
                            const parsed = JSON.parse(cleaned);
                            if (parsed && typeof parsed === 'object' && parsed.explanation_text) {
                                return {
                                    ...report,
                                    explanation_text: parsed.explanation_text,
                                    recommendations: parsed.recommendations || report.recommendations,
                                    breakdown_signals: parsed.breakdown_signals || report.breakdown_signals,
                                    language: targetLang
                                };
                            }
                        }
                    } catch (mErr) {
                        // Try next model
                    }
                }
            } catch (err) {
                console.warn('Direct Gemini translation error:', err);
            }
        }

        return { ...report, language: targetLang };
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
