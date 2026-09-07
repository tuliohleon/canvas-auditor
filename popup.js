document.getElementById('generateBtn').addEventListener('click', generateReport);
document.getElementById('clearBtn').addEventListener('click', clearErrors);
document.getElementById('copyBtn').addEventListener('click', copyToClipboard);

function updateCount() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) return;
        
        chrome.storage.local.get({errors: {}}, (data) => {
            const errors = data.errors[tabId] || [];
            const el = document.getElementById('count');
            if (errors.length === 0) {
                el.textContent = '✅ Sin errores detectados en esta página';
                el.className = 'count ok';
            } else {
                el.textContent = `⚠️ ${errors.length} error(es) detectado(s)`;
                el.className = 'count error';
            }
        });
    });
}

updateCount();

function generateReport() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const tab = tabs[0];
        const tabId = tab.id;
        
        chrome.storage.local.get({errors: {}}, (data) => {
            const errors = data.errors[tabId] || [];
            const reportDiv = document.getElementById('report');
            
            if (errors.length === 0) {
                reportDiv.innerHTML = '<div class="empty">No hay errores para reportar en esta pestaña.</div>';
                document.getElementById('copyBtn').style.display = 'none';
                return;
            }

            // Agrupar por tipo
            const grouped = {};
            errors.forEach(e => {
                const t = e.type || 'Desconocido';
                if (!grouped[t]) grouped[t] = [];
                grouped[t].push(e);
            });

            let r = `═══════════════════════════════════════════════════\n`;
            r += `       📋 REPORTE DE ERRORES - CANVAS LMS\n`;
            r += `═══════════════════════════════════════════════════\n\n`;
            r += `🌐 Página: ${tab.title}\n`;
            r += `🔗 URL: ${tab.url}\n`;
            r += `📅 Fecha: ${new Date().toLocaleString('es-ES')}\n`;
            r += `⚠️ Total de errores detectados: ${errors.length}\n\n`;
            r += `───────────────────────────────────────────────────\n\n`;

            const typeNames = {
                'resource': '🖼️ RECURSOS ESTÁTICOS (img, video, css, etc.)',
                'fetch': '🔌 PETICIONES FETCH (APIs, datos)',
                'xhr': '📡 PETICIONES XMLHttpRequest (AJAX)'
            };

            for (const [type, items] of Object.entries(grouped)) {
                r += `${typeNames[type] || '❓ ' + type.toUpperCase()}\n`;
                r += `   Cantidad: ${items.length}\n\n`;
                
                items.forEach((err, i) => {
                    r += `   ${i + 1}. ${err.tag ? `<${err.tag}> ` : ''}${err.url || 'URL no disponible'}\n`;
                    if (err.status) r += `      └─ Estado HTTP: ${err.status} ${err.statusText || ''}\n`;
                    if (err.method) r += `      └─ Método: ${err.method}\n`;
                    if (err.error) r += `      └─ Error: ${err.error}\n`;
                    if (err.note) r += `      └─ Nota: ${err.note}\n`;
                    r += `      └─ Hora: ${new Date(err.timestamp).toLocaleTimeString('es-ES')}\n\n`;
                });
            }

            r += `───────────────────────────────────────────────────\n`;
            r += `Reporte generado por Canvas Resource Auditor\n`;
            r += `═══════════════════════════════════════════════════`;

            reportDiv.textContent = r;
            document.getElementById('copyBtn').style.display = 'inline-block';
        });
    });
}

function clearErrors() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const tabId = tabs[0].id;
        chrome.storage.local.get({errors: {}}, (data) => {
            delete data.errors[tabId];
            chrome.storage.local.set({errors: data.errors}, () => {
                updateCount();
                document.getElementById('report').innerHTML = '<div class="empty">Errores limpiados.</div>';
                document.getElementById('copyBtn').style.display = 'none';
            });
        });
    });
}

function copyToClipboard() {
    const text = document.getElementById('report').textContent;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        const original = btn.textContent;
        btn.textContent = '✅ ¡Copiado!';
        setTimeout(() => btn.textContent = original, 2000);
    });
}