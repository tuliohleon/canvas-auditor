(function() {
    'use strict';
    
    const sendError = (errorInfo) => {
        try {
            chrome.runtime.sendMessage({
                action: 'logError',
                error: {
                    ...errorInfo,
                    pageUrl: window.location.href,
                    timestamp: new Date().toISOString()
                }
            });
        } catch(e) {}
    };

    // ===== 1. Errores de recursos estáticos (img, video, audio, link, script, iframe) =====
    const observeResource = (el) => {
        const tag = el.tagName;
        if (!['IMG','VIDEO','AUDIO','SOURCE','IFRAME','LINK','SCRIPT'].includes(tag)) return;
        
        const getUrl = () => el.src || el.href || el.currentSrc || '';
        const url = getUrl();
        if (!url) return;

        // Si ya falló antes de que cargáramos el script
        if (tag === 'IMG' && el.complete && el.naturalWidth === 0) {
            sendError({ type: 'resource', tag, url, note: 'Rota al inyectar auditor' });
            return;
        }

        // Escuchar error
        el.addEventListener('error', () => {
            sendError({ type: 'resource', tag, url: getUrl() });
        }, { once: true });
    };

    // Revisar elementos actuales
    document.querySelectorAll('img, video, audio, source, iframe, link, script').forEach(observeResource);

    // Observar elementos nuevos (Canvas carga mucho contenido dinámico)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.matches && node.matches('img, video, audio, source, iframe, link, script')) {
                        observeResource(node);
                    }
                    if (node.querySelectorAll) {
                        node.querySelectorAll('img, video, audio, source, iframe, link, script').forEach(observeResource);
                    }
                }
            });
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // ===== 2. Interceptar fetch() =====
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const url = args[0] || '';
        try {
            const response = await originalFetch.apply(this, args);
            if (!response.ok) {
                sendError({
                    type: 'fetch',
                    url: typeof url === 'string' ? url : url.url,
                    status: response.status,
                    statusText: response.statusText
                });
            }
            return response;
        } catch (err) {
            sendError({
                type: 'fetch',
                url: typeof url === 'string' ? url : url.url,
                error: err.message
            });
            throw err;
        }
    };

    // ===== 3. Interceptar XMLHttpRequest =====
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._audit = { method, url };
        return originalOpen.call(this, method, url, ...rest);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
        this.addEventListener('loadend', function() {
            if (this.status >= 400 || this.status === 0) {
                sendError({
                    type: 'xhr',
                    url: this._audit.url,
                    method: this._audit.method,
                    status: this.status,
                    statusText: this.statusText
                });
            }
        });
        return originalSend.apply(this, args);
    };

    // ===== 4. Capturar errores globales (scripts, etc.) =====
    window.addEventListener('error', (e) => {
        const target = e.target;
        if (target && target !== window && (target.src || target.href)) {
            sendError({
                type: 'resource',
                tag: target.tagName,
                url: target.src || target.href
            });
        }
    }, true);

})();