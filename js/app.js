// =============================================
// CONFIGURACIÓN DEL SISTEMA
// =============================================

// CONFIGURACIÓN FIJA (OCULTA PARA USUARIOS)
const SYSTEM_CONFIG = {
    // CORREO ADMINISTRADOR (FIJO PARA TODOS)
    adminEmail: "admin.listanegra@tudominio.com",  // CAMBIA ESTE CORREO
    
    // CORREO BACKUP (OPCIONAL)
    backupEmail: "backup.listanegra@tudominio.com",
    
    // INFORMACIÓN DEL SISTEMA
    systemName: "Lista Negra Urban v1.0",
    version: "1.0.0",
    
    // CONFIGURACIÓN DE SEGURIDAD
    enableLogs: true,
    autoBackup: true,
    
    // CONFIGURACIÓN DE REPORTES
    autoReport: true,
    reportFrequency: "daily", // daily, weekly, monthly
    lastReportDate: null
};

// =============================================
// VARIABLES GLOBALES
// =============================================
let records = [];
let currentFilter = "all";
let currentPage = 1;
const recordsPerPage = 10;
let editingId = null;

// Configuración de Google Sheets
let googleSheetConfig = {
    sheetId: '',
    apiKey: '',
    isPublished: false,
    lastSync: null
};

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    // Cargar configuración guardada
    loadConfig();
    
    // Cargar datos de ejemplo o guardados
    loadRecords();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Renderizar interfaz
    renderTable();
    updateStats();
    
    // Mostrar estado del sistema
    showAlert('Sistema Lista Negra Urban cargado correctamente', 'success');
    
    // Log de inicio
    logSystem('Sistema iniciado', { userAgent: navigator.userAgent });
});

// =============================================
// FUNCIONES DE LOG Y SEGURIDAD
// =============================================
function logSystem(action, data = {}) {
    if (!SYSTEM_CONFIG.enableLogs) return;
    
    const logEntry = {
        timestamp: new Date().toISOString(),
        action: action,
        data: data,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`
    };
    
    // Guardar en localStorage
    const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
    logs.push(logEntry);
    if (logs.length > 100) logs.shift(); // Mantener solo 100 registros
    localStorage.setItem('systemLogs', JSON.stringify(logs));
    
    // Log en consola (solo desarrollo)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log(`[SYSTEM LOG] ${action}:`, logEntry);
    }
}

// =============================================
// FUNCIONES DE CONFIGURACIÓN
// =============================================
function loadConfig() {
    // Cargar configuración de Google Sheets
    const savedConfig = localStorage.getItem('googleSheetConfig');
    if (savedConfig) {
        googleSheetConfig = JSON.parse(savedConfig);
        updateConfigDisplay();
    }
    
    // Cargar última fecha de reporte
    const lastReport = localStorage.getItem('lastReportDate');
    if (lastReport) {
        SYSTEM_CONFIG.lastReportDate = lastReport;
    }
    
    // Log de configuración cargada
    logSystem('Configuración cargada', { hasSheetConfig: !!savedConfig });
}

function saveConfig() {
    localStorage.setItem('googleSheetConfig', JSON.stringify(googleSheetConfig));
    updateConfigDisplay();
    logSystem('Configuración guardada', googleSheetConfig);
}

function updateConfigDisplay() {
    const sheetIdElement = document.getElementById('currentSheetId');
    const statusElement = document.getElementById('connectionStatus');
    
    if (googleSheetConfig.sheetId) {
        // Mostrar ID abreviado
        const shortId = googleSheetConfig.sheetId.length > 20 
            ? googleSheetConfig.sheetId.substring(0, 20) + '...' 
            : googleSheetConfig.sheetId;
        
        sheetIdElement.textContent = shortId;
        sheetIdElement.title = googleSheetConfig.sheetId;
        
        // Actualizar estado
        if (googleSheetConfig.isPublished) {
            statusElement.textContent = 'Conectado';
            statusElement.className = 'status-badge status-active';
        } else {
            statusElement.textContent = 'No verificado';
            statusElement.className = 'status-badge status-pending';
        }
    } else {
        sheetIdElement.textContent = 'No configurado';
        statusElement.textContent = 'No configurado';
        statusElement.className = 'status-badge status-inactive';
    }
}

// =============================================
// FUNCIONES DE GESTIÓN DE DATOS
// =============================================
function loadRecords() {
    const savedRecords = localStorage.getItem('listRecords');
    if (savedRecords) {
        records = JSON.parse(savedRecords);
    } else {
        // Datos de ejemplo iniciales
        records = [
            { 
                id: 1, 
                name: "Juan Pérez", 
                document: "12345678", 
                address: "Calle Falsa 123, Ciudad", 
                reason: "Incumplimiento de contrato", 
                status: "active",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            { 
                id: 2, 
                name: "María González", 
                document: "87654321", 
                address: "Av. Siempre Viva 456", 
                reason: "Pagos pendientes por 3 meses", 
                status: "inactive",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            { 
                id: 3, 
                name: "Carlos López", 
                document: "11223344", 
                address: "Carrera 7 #45-23", 
                reason: "Daños a propiedad común", 
                status: "pending",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        saveRecords();
    }
}

function saveRecords() {
    localStorage.setItem('listRecords', JSON.stringify(records));
    updateStats();
    logSystem('Registros guardados', { count: records.length });
}

function updateStats() {
    document.getElementById('totalRecords').textContent = records.length;
    document.getElementById('activeRecords').textContent = 
        records.filter(r => r.status === 'active').length;
    document.getElementById('pendingRecords').textContent = 
        records.filter(r => r.status === 'pending').length;
    document.getElementById('inactiveRecords').textContent = 
        records.filter(r => r.status === 'inactive').length;
}

// =============================================
// FUNCIONES DE INTERFAZ
// =============================================
function renderTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const tableBody = document.getElementById('dataTable');
    const emptyState = document.getElementById('emptyState');
    const pagination = document.getElementById('pagination');

    // Filtrar registros
    const filteredRecords = records.filter(record => {
        const matchesSearch = searchTerm === '' || 
            record.name.toLowerCase().includes(searchTerm) ||
            record.document.toLowerCase().includes(searchTerm) ||
            record.address.toLowerCase().includes(searchTerm) ||
            record.reason.toLowerCase().includes(searchTerm);
        
        const matchesFilter = currentFilter === 'all' || record.status === currentFilter;
        
        return matchesSearch && matchesFilter;
    });

    // Calcular paginación
    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const pageRecords = filteredRecords.slice(startIndex, endIndex);

    // Mostrar/ocultar estado vacío
    if (pageRecords.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        pagination.innerHTML = '';
        return;
    } else {
        emptyState.style.display = 'none';
    }

    // Generar filas de la tabla
    let tableHTML = '';
    
    pageRecords.forEach(record => {
        // Determinar clase de estado
        let statusClass = '';
        let statusText = '';
        
        switch(record.status) {
            case 'active':
                statusClass = 'status-active';
                statusText = 'Activo';
                break;
            case 'inactive':
                statusClass = 'status-inactive';
                statusText = 'Inactivo';
                break;
            case 'pending':
                statusClass = 'status-pending';
                statusText = 'Pendiente';
                break;
        }

        // Crear fila con atributos para responsive
        tableHTML += `
            <div class="table-row" data-id="${record.id}">
                <div class="col-id" data-label="ID">${record.id}</div>
                <div class="col-name" data-label="Nombre">${record.name}</div>
                <div class="col-doc" data-label="Documento">${record.document}</div>
                <div class="col-address" data-label="Dirección">${record.address}</div>
                <div class="col-reason" data-label="Motivo">${record.reason}</div>
                <div class="col-status" data-label="Estado">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="col-actions">
                    <button class="action-btn edit-btn" onclick="editRecord(${record.id})" 
                            title="Editar registro">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteRecord(${record.id})" 
                            title="Eliminar registro">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    tableBody.innerHTML = tableHTML;
    renderPagination(totalPages);
    
    logSystem('Tabla renderizada', { 
        filtered: filteredRecords.length, 
        currentPage: currentPage,
        totalPages: totalPages 
    });
}

function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '';
    
    // Botón anterior
    paginationHTML += `
        <button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
                onclick="changePage(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''}
                title="Página anterior">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Números de página
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    // Primera página
    if (startPage > 1) {
        paginationHTML += `
            <button class="page-btn" onclick="changePage(1)" title="Primera página">
                1
            </button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span class="page-btn disabled">...</span>`;
        }
    }
    
    // Páginas del medio
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" 
                    onclick="changePage(${i})"
                    title="Página ${i}">
                ${i}
            </button>
        `;
    }
    
    // Última página
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="page-btn disabled">...</span>`;
        }
        paginationHTML += `
            <button class="page-btn" onclick="changePage(${totalPages})" 
                    title="Última página">
                ${totalPages}
            </button>
        `;
    }
    
    // Botón siguiente
    paginationHTML += `
        <button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                onclick="changePage(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''}
                title="Página siguiente">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    pagination.innerHTML = paginationHTML;
}

function changePage(page) {
    if (page < 1 || page > Math.ceil(records.length / recordsPerPage)) return;
    
    currentPage = page;
    renderTable();
    
    // Scroll suave al top de la tabla
    document.querySelector('.data-section').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
    
    logSystem('Cambio de página', { page: page });
}

function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    
    const alertTypes = {
        'success': { 
            class: 'alert-success', 
            icon: 'fas fa-check-circle' 
        },
        'warning': { 
            class: 'alert-warning', 
            icon: 'fas fa-exclamation-triangle' 
        },
        'danger': { 
            class: 'alert-danger', 
            icon: 'fas fa-times-circle' 
        },
        'info': { 
            class: 'alert-info', 
            icon: 'fas fa-info-circle' 
        }
    };
    
    const alertType = alertTypes[type] || alertTypes.info;
    
    const alertHTML = `
        <div class="alert ${alertType.class}">
            <i class="${alertType.icon}"></i>
            <div>${message}</div>
        </div>
    `;
    
    alertContainer.innerHTML = alertHTML;
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (alertContainer.innerHTML.includes(message)) {
            alertContainer.innerHTML = '';
        }
    }, 5000);
    
    logSystem('Alerta mostrada', { type: type, message: message });
}

// =============================================
// FUNCIONES DE GESTIÓN DE REGISTROS
// =============================================
function openAddModal() {
    editingId = null;
    document.getElementById('modalTitle').innerHTML = 
        '<i class="fas fa-plus"></i> Agregar Nuevo Registro';
    document.getElementById('recordForm').reset();
    document.getElementById('recordId').value = '';
    document.getElementById('recordModal').style.display = 'flex';
    logSystem('Modal agregar abierto');
}

function editRecord(id) {
    const record = records.find(r => r.id === id);
    if (!record) return;
    
    editingId = id;
    document.getElementById('modalTitle').innerHTML = 
        '<i class="fas fa-edit"></i> Editar Registro';
    document.getElementById('name').value = record.name;
    document.getElementById('document').value = record.document;
    document.getElementById('address').value = record.address;
    document.getElementById('reason').value = record.reason;
    document.getElementById('status').value = record.status;
    document.getElementById('recordId').value = record.id;
    
    document.getElementById('recordModal').style.display = 'flex';
    logSystem('Modal editar abierto', { recordId: id });
}

function saveRecord() {
    const name = document.getElementById('name').value.trim();
    const document = document.getElementById('document').value.trim();
    const address = document.getElementById('address').value.trim();
    const reason = document.getElementById('reason').value.trim();
    const status = document.getElementById('status').value;
    const recordId = document.getElementById('recordId').value;
    
    // Validaciones
    if (!name || !document || !address || !reason) {
        showAlert('Por favor completa todos los campos obligatorios.', 'danger');
        return;
    }
    
    if (document.length < 4) {
        showAlert('El documento debe tener al menos 4 caracteres.', 'danger');
        return;
    }
    
    if (editingId) {
        // Editar registro existente
        const index = records.findIndex(r => r.id === parseInt(editingId));
        if (index !== -1) {
            records[index] = { 
                ...records[index], 
                name, 
                document, 
                address, 
                reason, 
                status,
                updatedAt: new Date().toISOString()
            };
            showAlert('Registro actualizado correctamente.', 'success');
            logSystem('Registro editado', { 
                recordId: editingId, 
                changes: { name, document, address, reason, status } 
            });
        }
    } else {
        // Agregar nuevo registro
        const newId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
        const newRecord = {
            id: newId,
            name,
            document,
            address,
            reason,
            status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        records.push(newRecord);
        showAlert('Registro agregado correctamente.', 'success');
        logSystem('Registro agregado', { newRecord });
    }
    
    closeModal();
    saveRecords();
    renderTable();
    
    // Notificar al correo administrador (simulado)
    notifyAdmin(editingId ? 'update' : 'create');
}

function deleteRecord(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.')) {
        return;
    }
    
    const record = records.find(r => r.id === id);
    const recordIndex = records.findIndex(r => r.id === id);
    
    if (recordIndex !== -1) {
        records.splice(recordIndex, 1);
        showAlert('Registro eliminado correctamente.', 'success');
        saveRecords();
        renderTable();
        
        // Log y notificación
        logSystem('Registro eliminado', { record });
        notifyAdmin('delete', record);
    }
}

// =============================================
// FUNCIONES DE GOOGLE SHEETS
// =============================================
async function importFromGoogleSheets() {
    if (!googleSheetConfig.sheetId) {
        showAlert('Primero configura el ID de la hoja de Google Sheets.', 'danger');
        openConfigModal();
        return;
    }

    showAlert('Conectando con Google Sheets...', 'warning');
    logSystem('Importando de Google Sheets', { sheetId: googleSheetConfig.sheetId });
    
    try {
        let data;
        const useAPI = googleSheetConfig.apiKey && googleSheetConfig.apiKey.length > 10;
        
        if (useAPI) {
            // Método con API Key
            const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetConfig.sheetId}/values/A:F?key=${googleSheetConfig.apiKey}`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`Error API: ${response.status} - ${response.statusText}`);
            }
            
            data = await response.json();
        } else {
            // Método con hoja publicada
            const csvUrl = `https://docs.google.com/spreadsheets/d/${googleSheetConfig.sheetId}/gviz/tq?tqx=out:csv&sheet=Datos`;
            const response = await fetch(csvUrl);
            
            if (!response.ok) {
                throw new Error(`No se pudo acceder a la hoja. Asegúrate de que esté publicada.`);
            }
            
            const csvText = await response.text();
            data = parseCSV(csvText);
        }
        
        // Procesar datos
        const newRecords = processSheetData(data);
        
        if (newRecords.length === 0) {
            throw new Error('No se encontraron datos en la hoja');
        }
        
        // Reemplazar registros existentes
        records = newRecords;
        googleSheetConfig.isPublished = true;
        googleSheetConfig.lastSync = new Date().toISOString();
        
        saveConfig();
        saveRecords();
        
        showAlert(`${records.length} registros importados desde Google Sheets`, 'success');
        logSystem('Importación exitosa', { 
            recordCount: records.length,
            method: useAPI ? 'API' : 'CSV' 
        });
        
        // Notificar al admin
        notifyAdmin('import', { count: records.length });
        
    } catch (error) {
        console.error('Error al importar:', error);
        showAlert(`Error: ${error.message}`, 'danger');
        logSystem('Error en importación', { error: error.message });
    }
}

function processSheetData(data) {
    const newRecords = [];
    
    if (data.values) {
        // Datos de API v4
        for (let i = 1; i < data.values.length; i++) {
            const row = data.values[i];
            if (row && row.length >= 5) {
                const record = {
                    id: parseInt(row[0]) || i,
                    name: row[1]?.trim() || '',
                    document: row[2]?.toString().trim() || '',
                    address: row[3]?.trim() || '',
                    reason: row[4]?.trim() || '',
                    status: (row[5]?.toLowerCase()?.trim() || 'active'),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                // Validar estado
                if (!['active', 'inactive', 'pending'].includes(record.status)) {
                    record.status = 'active';
                }
                
                newRecords.push(record);
            }
        }
    } else if (Array.isArray(data)) {
        // Datos de CSV parseado
        data.forEach((row, i) => {
            if (i > 0 && row.length >= 5) {
                const record = {
                    id: parseInt(row[0]) || i,
                    name: row[1]?.trim() || '',
                    document: row[2]?.toString().trim() || '',
                    address: row[3]?.trim() || '',
                    reason: row[4]?.trim() || '',
                    status: (row[5]?.toLowerCase()?.trim() || 'active'),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                if (!['active', 'inactive', 'pending'].includes(record.status)) {
                    record.status = 'active';
                }
                
                newRecords.push(record);
            }
        });
    }
    
    return newRecords;
}

function parseCSV(csvText) {
    const rows = [];
    const lines = csvText.split('\n');
    
    lines.forEach(line => {
        if (line.trim()) {
            const row = [];
            let inQuotes = false;
            let currentCell = '';
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    row.push(currentCell);
                    currentCell = '';
                } else {
                    currentCell += char;
                }
            }
            
            row.push(currentCell);
            rows.push(row.map(cell => cell.trim().replace(/^"|"$/g, '')));
        }
    });
    
    return rows;
}

async function testGoogleSheetsConnection() {
    if (!googleSheetConfig.sheetId) {
        showAlert('Configura primero el ID de la hoja.', 'danger');
        return;
    }

    showAlert('Probando conexión con Google Sheets...', 'warning');
    logSystem('Probando conexión Google Sheets');
    
    try {
        const testUrl = `https://docs.google.com/spreadsheets/d/${googleSheetConfig.sheetId}/gviz/tq?tqx=out:csv`;
        const response = await fetch(testUrl, { method: 'HEAD' });
        
        if (response.ok) {
            googleSheetConfig.isPublished = true;
            saveConfig();
            showAlert('✅ Conexión exitosa. La hoja es accesible.', 'success');
            logSystem('Conexión exitosa');
        } else {
            googleSheetConfig.isPublished = false;
            saveConfig();
            showAlert('⚠️ La hoja existe pero podría no estar publicada. Intenta con API Key.', 'warning');
            logSystem('Conexión fallida', { status: response.status });
        }
    } catch (error) {
        googleSheetConfig.isPublished = false;
        saveConfig();
        showAlert('❌ Error de conexión. Verifica el ID o usa API Key.', 'danger');
        logSystem('Error de conexión', { error: error.message });
    }
}

// =============================================
// FUNCIONES DE REPORTES Y CORREO
// =============================================
function generateReport() {
    showAlert('Generando reporte para el administrador...', 'warning');
    
    const reportPeriod = document.getElementById('reportPeriod')?.value || 'all';
    const reportFilter = document.getElementById('reportFilter')?.value || 'all';
    
    // Filtrar registros según selección
    let filteredRecords = [...records];
    
    // Aplicar filtro de estado
    if (reportFilter !== 'all') {
        filteredRecords = filteredRecords.filter(r => r.status === reportFilter);
    }
    
    // Aplicar filtro de fecha (simplificado)
    if (reportPeriod !== 'all') {
        const now = new Date();
        filteredRecords = filteredRecords.filter(record => {
            const recordDate = new Date(record.createdAt || record.updatedAt);
            switch(reportPeriod) {
                case 'today':
                    return recordDate.toDateString() === now.toDateString();
                case 'week':
                    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                    return recordDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
                    return recordDate >= monthAgo;
                default:
                    return true;
            }
        });
    }
    
    // Crear contenido del reporte
    const reportData = {
        fecha: new Date().toLocaleString(),
        periodo: reportPeriod,
        filtro: reportFilter,
        totalRegistros: records.length,
        registrosFiltrados: filteredRecords.length,
        registrosActivos: records.filter(r => r.status === 'active').length,
        registrosInactivos: records.filter(r => r.status === 'inactive').length,
        registrosPendientes: records.filter(r => r.status === 'pending').length,
        ultimaSincronizacion: googleSheetConfig.lastSync || 'Nunca',
        datos: filteredRecords.slice(0, 50), // Limitar a 50 registros
        systemConfig: {
            adminEmail: SYSTEM_CONFIG.adminEmail,
            sheetConfigured: !!googleSheetConfig.sheetId,
            version: SYSTEM_CONFIG.version
        }
    };
    
    // Crear archivo descargable
    const reportContent = createReportContent(reportData);
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Descargar archivo
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_lista_negra_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Notificar al usuario
    showAlert(`Reporte generado con ${filteredRecords.length} registros. Se ha notificado al administrador.`, 'success');
    
    // Notificar al administrador (simulado)
    notifyAdmin('report', reportData);
    
    // Guardar fecha del último reporte
    SYSTEM_CONFIG.lastReportDate = new Date().toISOString();
    localStorage.setItem('lastReportDate', SYSTEM_CONFIG.lastReportDate);
    
    logSystem('Reporte generado', { 
        period: reportPeriod, 
        filter: reportFilter,
        recordCount: filteredRecords.length 
    });
    
    closeReportModal();
}

function createReportContent(reportData) {
    let content = '='.repeat(60) + '\n';
    content += 'REPORTE DE LISTA NEGRA URBAN\n';
    content += '='.repeat(60) + '\n\n';
    
    content += `Fecha de generación: ${reportData.fecha}\n`;
    content += `Periodo: ${getPeriodText(reportData.periodo)}\n`;
    content += `Filtro aplicado: ${getFilterText(reportData.filtro)}\n\n`;
    
    content += '-'
