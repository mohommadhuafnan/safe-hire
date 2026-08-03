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
     * @param {string} [config.modelName] - Default: "gemini-3.6-flash" (or "gemini-2.0-flash")
     * @param {string} [config.apiBaseUrl] - OpenAI compatibility or REST endpoint
     * @param {number} [config.temperature] - 0.0 to 2.0 (Default: 1.0)
     * @param {number} [config.topP] - 0.0 to 1.0 (Default: 0.95)
     * @param {number} [config.maxTokens] - Max output tokens (Default: 4096)
     */
    constructor(config = {}) {
        this.apiKey = config.apiKey || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || "";
        this.modelName = config.modelName || "gemini-3.6-flash";
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
        const messages = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
        const endpoint = `${this.apiBaseUrl}/chat/completions`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.modelName,
                messages: messages,
                temperature: this.temperature,
                top_p: this.topP,
                max_tokens: this.maxTokens,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error (HTTP ${response.status}): ${errorText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
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

        const messages = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
        const endpoint = `${this.apiBaseUrl}/chat/completions`;

        let accumulatedContent = '';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.modelName,
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
                throw new Error(`Gemini API Error (HTTP ${response.status}): ${errorText}`);
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

            if (onComplete) {
                onComplete({ content: accumulatedContent });
            }

        } catch (err) {
            if (err.name !== 'AbortError' && onError) {
                onError(err);
            }
        } finally {
            this.currentAbortController = null;
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
