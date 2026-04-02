const now = () => {
    if (typeof performance !== 'undefined' && performance.now) {
        return performance.now();
    }
    return Date.now();
};

const pushBrowserMetric = (payload) => {
    if (typeof window === 'undefined') return;
    if (!Array.isArray(window.__UNJBG_PERF__)) {
        window.__UNJBG_PERF__ = [];
    }
    window.__UNJBG_PERF__.push(payload);
};

export const estimatePayloadKB = (value) => {
    try {
        const encoded = new TextEncoder().encode(JSON.stringify(value));
        return Number((encoded.length / 1024).toFixed(2));
    } catch {
        return 0;
    }
};

export const createPerfTrace = (flow, metadata = {}) => {
    const start = now();

    return {
        end(status = 'ok', details = {}) {
            const durationMs = Number((now() - start).toFixed(1));
            const payload = {
                ts: new Date().toISOString(),
                flow,
                status,
                durationMs,
                ...metadata,
                ...details,
            };

            pushBrowserMetric(payload);

            if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
                console.info(`[perf] ${flow}`, payload);
            }

            return payload;
        },
    };
};
