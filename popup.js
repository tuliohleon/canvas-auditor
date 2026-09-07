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

const reportLabels = {
    resource: {
        title: '🖼️ RECURSOS DE LA PÁGINA',
        plainName: 'recursos de la página',
        explanation: 'Son elementos visibles o necesarios para la página, como imágenes, videos, archivos de estilo o contenido incrustado.'
    },
    fetch: {
        title: '🔌 SOLICITUDES DE DATOS',
        plainName: 'solicitudes de datos',
        explanation: 'Canvas intentó pedir información al servidor, pero no recibió una respuesta correcta.'
    },
    xhr: {
        title: '📡 SOLICITUDES DE DATOS (AJAX)',
        plainName: 'solicitudes de datos',
        explanation: 'La página pidió información en segundo plano y la operación no se completó correctamente.'
    }
};

function getStatusExplanation(status) {
    if (status === 401) return 'Se requiere iniciar sesión o la sesión ya no es válida.';
    if (status === 403) return 'No tienes permiso para acceder a este recurso.';
    if (status === 404) return 'El recurso no se encontró; puede haberse movido, eliminado o tener una dirección incorrecta.';
    if (status >= 500) return 'El servidor tuvo un problema al intentar atender la solicitud.';
    if (status >= 400) return 'El servidor no pudo completar la solicitud. El código técnico ayuda al equipo de soporte a investigarlo.';
    if (status === 0) return 'No se recibió respuesta. Puede deberse a la red, a un bloqueo del navegador o a un servicio no disponible.';
    return 'No se pudo completar la carga de este elemento.';
}

function getErrorExplanation(error) {
    const status = Number(error.status);
    if (Number.isFinite(status)) return getStatusExplanation(status);
    if (error.type === 'resource') {
        return 'Este elemento no se pudo cargar. Revisa si falta contenido en la página o si el enlace dejó de funcionar.';
    }
    return 'La página no pudo obtener la información que necesitaba. Puede ser un problema temporal de conexión o del servicio.';
}

function getNextStep(error) {
    const status = Number(error.status);
    if (status === 401 || status === 403) return 'Comprueba que la persona afectada tenga sesión iniciada y permisos para ver este contenido.';
    if (status === 404 || error.type === 'resource') return 'Comprueba si el contenido se muestra en Canvas y pide al responsable que revise o actualice el enlace.';
    if (status >= 500) return 'Vuelve a intentarlo más tarde. Si continúa, comparte este reporte con soporte técnico.';
    return 'Recarga la página y repite la acción. Si persiste, comparte este reporte con soporte técnico.';
}

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

            const typeSummary = Object.entries(grouped)
                .map(([type, items]) => `${items.length} ${reportLabels[type]?.plainName || type}`)
                .join(', ');

            let r = `═══════════════════════════════════════════════════\n`;
            r += `       📋 REPORTE DE ERRORES - CANVAS LMS\n`;
            r += `═══════════════════════════════════════════════════\n\n`;
            r += `🌐 Página: ${tab.title}\n`;
            r += `🔗 URL: ${tab.url}\n`;
            r += `📅 Fecha: ${new Date().toLocaleString('es-ES')}\n`;
            r += `⚠️ Total de errores detectados: ${errors.length}\n\n`;
            r += `RESUMEN EN LENGUAJE CLARO\n`;
            r += `Se detectaron ${errors.length} incidencia(s) mientras se usaba esta página: ${typeSummary}.\n`;
            r += `Esto puede hacer que algún contenido no aparezca, que una acción no termine o que parte de la página funcione de forma incompleta.\n`;
            r += `El detalle técnico se incluye más abajo para que soporte pueda investigarlo.\n\n`;
            r += `───────────────────────────────────────────────────\n\n`;

            for (const [type, items] of Object.entries(grouped)) {
                const label = reportLabels[type] || {
                    title: `❓ ${type.toUpperCase()}`,
                    explanation: 'Se detectó un problema cuyo tipo no pudo clasificarse.'
                };
                r += `${label.title}\n`;
                r += `   Cantidad: ${items.length}\n\n`;
                r += `   Qué significa: ${label.explanation}\n\n`;
                
                items.forEach((err, i) => {
                    r += `   ${i + 1}. Explicación: ${getErrorExplanation(err)}\n`;
                    r += `      └─ Qué hacer: ${getNextStep(err)}\n`;
                    r += `      └─ Dirección afectada: ${err.url || 'URL no disponible'}\n`;
                    if (err.tag) r += `      └─ Elemento: <${err.tag}>\n`;
                    if (err.status !== undefined && err.status !== null) r += `      └─ Estado HTTP (dato técnico): ${err.status} ${err.statusText || ''}\n`;
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
