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
        this.modelName = config.modelName || "gemini-2.5-flash";
        this.fallbackModels = ["gemini-3.6-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
        this.apiBaseUrl = (config.apiBaseUrl || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/+$/, '');
        this.temperature = config.temperature !== undefined ? config.temperature : 1.0;
        this.topP = config.topP !== undefined ? config.topP : 0.95;
        this.maxTokens = config.maxTokens || 4096;
        this.currentAbortController = null;
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
                    return data.choices?.[0]?.message?.content || "";
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
                                    if (onToken) onToken(accumulatedContent, token);
                                }
                            } catch (e) {
                                // Skip invalid SSE JSON chunk
                            }
                        }
                    }
                }

                streamSuccess = true;
                if (onComplete) {
                    onComplete({ content: accumulatedContent });
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
                    const replyText = data.content || "";
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
