/**
 * DeepSeekV4Client - Lightweight Standalone Client Module
 * Supports streaming, reasoning_content extraction, Hugging Face Router, vLLM, SGLang & DeepSeek API.
 * Copy & paste this file directly into any web project!
 */

class DeepSeekV4Client {
    /**
     * @param {Object} config
     * @param {string} [config.apiBaseUrl] - e.g. "https://router.huggingface.co/v1" or "http://localhost:8000/v1"
     * @param {string} [config.apiKey] - Your API key
     * @param {string} [config.modelName] - e.g. "deepseek-ai/DeepSeek-V4-Flash"
     * @param {string} [config.reasoningEffort] - "low", "high", or "max"
     * @param {number} [config.temperature] - 0.0 to 2.0
     * @param {number} [config.topP] - 0.0 to 1.0
     * @param {number} [config.maxTokens] - Max tokens to generate
     */
    constructor(config = {}) {
        this.apiBaseUrl = (config.apiBaseUrl || "https://router.huggingface.co/v1").replace(/\/+$/, '');
        this.apiKey = config.apiKey || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEEPSEEK_V4_API_KEY) || "";
        this.modelName = config.modelName || "deepseek-ai/DeepSeek-V4-Flash";
        this.reasoningEffort = config.reasoningEffort || "max";
        this.temperature = config.temperature !== undefined ? config.temperature : 1.0;
        this.topP = config.topP !== undefined ? config.topP : 0.95;
        this.maxTokens = config.maxTokens || 4096;
        this.currentAbortController = null;
    }

    /**
     * Send messages to model with real-time SSE streaming callback
     * @param {Array<{role: string, content: string}>} messages - Array of message objects
     * @param {Object} callbacks
     * @param {function(string): void} [callbacks.onReasoning] - Streams model thinking steps
     * @param {function(string): void} [callbacks.onToken] - Streams response tokens
     * @param {function(Object): void} [callbacks.onComplete] - Called when stream finishes
     * @param {function(Error): void} [callbacks.onError] - Called on error
     * @returns {AbortController}
     */
    async sendMessageStream(messages, { onReasoning, onToken, onComplete, onError }) {
        this.cancelActiveStream();
        this.currentAbortController = new AbortController();

        const chatEndpoint = `${this.apiBaseUrl}/chat/completions`;
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const requestBody = {
            model: this.modelName,
            messages: messages,
            temperature: this.temperature,
            top_p: this.topP,
            max_tokens: this.maxTokens,
            stream: true
        };

        if (this.reasoningEffort && this.reasoningEffort !== 'none') {
            requestBody.reasoning_effort = this.reasoningEffort;
        }

        let accumulatedContent = '';
        let accumulatedReasoning = '';

        try {
            const response = await fetch(chatEndpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                signal: this.currentAbortController.signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
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
                    if (!trimmed || trimmed.startsWith(':') || trimmed === 'data: [DONE]') continue;

                    if (trimmed.startsWith('data: ')) {
                        try {
                            const parsed = JSON.parse(trimmed.substring(6));
                            const delta = parsed.choices?.[0]?.delta;

                            if (delta) {
                                // Extract reasoning content
                                if (delta.reasoning_content) {
                                    accumulatedReasoning += delta.reasoning_content;
                                    if (onReasoning) onReasoning(accumulatedReasoning);
                                }
                                // Extract response content
                                if (delta.content) {
                                    accumulatedContent += delta.content;
                                    if (onToken) onToken(accumulatedContent, delta.content);
                                }
                            }
                        } catch (e) {
                            // Ignore SSE JSON chunk parse errors
                        }
                    }
                }
            }

            // Extract <think> tags if reasoning_content was embedded in content
            if (!accumulatedReasoning && accumulatedContent.includes('<think>')) {
                const match = accumulatedContent.match(/<think>([\s\S]*?)<\/think>/);
                if (match) {
                    accumulatedReasoning = match[1].trim();
                    accumulatedContent = accumulatedContent.replace(/<think>[\s\S]*?<\/think>/, '').trim();
                    if (onReasoning) onReasoning(accumulatedReasoning);
                    if (onToken) onToken(accumulatedContent, '');
                }
            }

            if (onComplete) {
                onComplete({
                    content: accumulatedContent,
                    reasoningContent: accumulatedReasoning
                });
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

export default DeepSeekV4Client;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeepSeekV4Client;
}
