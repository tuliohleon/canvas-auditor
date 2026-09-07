document.getElementById('generateBtn').addEventListener('click', addCurrentPageToReport);
document.getElementById('clearBtn').addEventListener('click', clearReport);
document.getElementById('copyBtn').addEventListener('click', copyToClipboard);

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

function updateCount() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) return;

        chrome.storage.local.get({errors: {}, reportErrors: []}, (data) => {
            const errors = data.errors[tabId] || [];
            const count = document.getElementById('count');
            const generateButton = document.getElementById('generateBtn');

            if (errors.length === 0) {
                count.textContent = '✅ Sin errores detectados en esta página';
                count.className = 'count ok';
            } else {
                count.textContent = `⚠️ ${errors.length} error(es) detectado(s) en esta página`;
                count.className = 'count error';
            }

            generateButton.textContent = data.reportErrors.length > 0
                ? '➕ Agregar al Reporte'
                : '📄 Generar Reporte';
        });
    });
}

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
    if (error.type === 'resource') return 'Este elemento no se pudo cargar. Revisa si falta contenido en la página o si el enlace dejó de funcionar.';
    return 'La página no pudo obtener la información que necesitaba. Puede ser un problema temporal de conexión o del servicio.';
}

function getNextStep(error) {
    const status = Number(error.status);
    if (status === 401 || status === 403) return 'Comprueba que la persona afectada tenga sesión iniciada y permisos para ver este contenido.';
    if (status === 404 || error.type === 'resource') return 'Comprueba si el contenido se muestra en Canvas y pide al responsable que revise o actualice el enlace.';
    if (status >= 500) return 'Vuelve a intentarlo más tarde. Si continúa, comparte este reporte con soporte técnico.';
    return 'Recarga la página y repite la acción. Si persiste, comparte este reporte con soporte técnico.';
}

function errorKey(error) {
    return [error.type, error.pageUrl, error.url, error.tag, error.method, error.status, error.statusText, error.error, error.note]
        .map(value => value ?? '')
        .join('|');
}

function addCurrentPageToReport() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const tab = tabs[0];
        if (!tab) return;

        chrome.storage.local.get({errors: {}, reportErrors: []}, (data) => {
            const pageErrors = data.errors[tab.id] || [];
            const reportDiv = document.getElementById('report');

            if (pageErrors.length === 0 && data.reportErrors.length === 0) {
                reportDiv.innerHTML = '<div class="empty">No hay errores para agregar en esta pestaña.</div>';
                document.getElementById('copyBtn').style.display = 'none';
                return;
            }

            const knownErrors = new Set(data.reportErrors.map(errorKey));
            const newErrors = pageErrors.filter(error => {
                const key = errorKey(error);
                if (knownErrors.has(key)) return false;
                knownErrors.add(key);
                return true;
            });
            const reportErrors = [...data.reportErrors, ...newErrors];

            chrome.storage.local.set({reportErrors}, () => {
                renderReport(reportErrors, newErrors.length);
                updateCount();
            });
        });
    });
}

function renderReport(errors, addedCount = 0) {
    const reportDiv = document.getElementById('report');
    if (errors.length === 0) {
        reportDiv.innerHTML = '<div class="empty">Aún no hay errores en el reporte.</div>';
        document.getElementById('copyBtn').style.display = 'none';
        return;
    }

    const grouped = {};
    errors.forEach(error => {
        const type = error.type || 'Desconocido';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(error);
    });

    const typeSummary = Object.entries(grouped)
        .map(([type, items]) => `${items.length} ${reportLabels[type]?.plainName || type}`)
        .join(', ');
    const guidance = new Map();
    errors.forEach(error => {
        const explanation = getErrorExplanation(error);
        const nextStep = getNextStep(error);
        const key = `${explanation}|${nextStep}`;

        if (!guidance.has(key)) guidance.set(key, {explanation, nextStep, count: 0});
        guidance.get(key).count += 1;
    });

    let report = `═══════════════════════════════════════════════════\n`;
    report += `       📋 REPORTE DE ERRORES - CANVAS LMS\n`;
    report += `═══════════════════════════════════════════════════\n\n`;
    report += `📅 Última actualización: ${new Date().toLocaleString('es-ES')}\n`;
    report += `⚠️ Total de errores únicos: ${errors.length}\n\n`;
    report += `RESUMEN\n`;
    report += `Se detectaron ${errors.length} incidencia(s) única(s) durante la navegación: ${typeSummary}.\n`;
    report += `Esto puede hacer que algún contenido no aparezca, que una acción no termine o que parte de la página funcione de forma incompleta.\n`;
    report += `El detalle técnico se incluye más abajo para que soporte pueda investigarlo.\n\n`;
    report += `EXPLICACIÓN Y QUÉ HACER\n`;
    report += `Estas indicaciones aplican a las incidencias indicadas antes de cada bloque de detalle.\n\n`;
    [...guidance.values()].forEach(({explanation, nextStep, count}, index) => {
        report += `${index + 1}. Aplica a ${count} incidencia(s)\n`;
        report += `   Explicación: ${explanation}\n`;
        report += `   Qué hacer: ${nextStep}\n\n`;
    });
    if (addedCount > 0) report += `Se agregaron ${addedCount} incidencia(s) nueva(s) de la página actual.\n\n`;
    report += `───────────────────────────────────────────────────\n\n`;

    for (const [type, items] of Object.entries(grouped)) {
        const label = reportLabels[type] || {
            title: `❓ ${type.toUpperCase()}`,
            explanation: 'Se detectó un problema cuyo tipo no pudo clasificarse.'
        };
        report += `${label.title}\n`;
        report += `   Cantidad: ${items.length}\n\n`;
        report += `   Qué significa: ${label.explanation}\n\n`;

        items.forEach((error, index) => {
            report += `   ${index + 1}. Página donde se detectó: ${error.pageUrl || 'URL no disponible'}\n`;
            report += `      └─ Dirección afectada: ${error.url || 'URL no disponible'}\n`;
            if (error.tag) report += `      └─ Elemento: <${error.tag}>\n`;
            if (error.status !== undefined && error.status !== null) report += `      └─ Estado HTTP (dato técnico): ${error.status} ${error.statusText || ''}\n`;
            if (error.method) report += `      └─ Método: ${error.method}\n`;
            if (error.error) report += `      └─ Error: ${error.error}\n`;
            if (error.note) report += `      └─ Nota: ${error.note}\n`;
            report += `      └─ Hora: ${new Date(error.timestamp).toLocaleTimeString('es-ES')}\n\n`;
        });
    }

    report += `───────────────────────────────────────────────────\n`;
    report += `Reporte generado por Canvas Resource Auditor\n`;
    report += `═══════════════════════════════════════════════════`;

    reportDiv.textContent = report;
    document.getElementById('copyBtn').style.display = 'inline-block';
}

function clearReport() {
    chrome.storage.local.set({reportErrors: []}, () => {
        document.getElementById('report').innerHTML = '<div class="empty">Reporte limpiado. Puedes iniciar una recopilación nueva.</div>';
        document.getElementById('copyBtn').style.display = 'none';
        updateCount();
    });
}

function copyToClipboard() {
    const text = document.getElementById('report').textContent;
    navigator.clipboard.writeText(text).then(() => {
        const button = document.getElementById('copyBtn');
        const original = button.textContent;
        button.textContent = '✅ ¡Copiado!';
        setTimeout(() => button.textContent = original, 2000);
    });
}

chrome.storage.local.get({reportErrors: []}, (data) => {
    updateCount();
    if (data.reportErrors.length > 0) renderReport(data.reportErrors);
});
