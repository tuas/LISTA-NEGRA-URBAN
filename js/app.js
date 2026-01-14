  <script>
        // ===== VARIABLES GLOBALES =====
        let records = [
            {
                id: 1,
                address: "palacios 2098",
                phones: ["dsfsdf"],
                amount: 43434.00,
                notes: "",
                createdAt: new Date().toISOString()
            }
        ];
        
        let editingId = null;
        let phoneCount = 0;
        
        // ===== INICIALIZACIÓN =====
        document.addEventListener('DOMContentLoaded', function() {
            // Configurar búsqueda
            const searchInput = document.getElementById('searchInput');
            searchInput.addEventListener('input', filterRecords);
            
            // Configurar botón nuevo registro
            const newRecordBtn = document.getElementById('newRecordBtn');
            newRecordBtn.addEventListener('click', openNewRecordModal);
            
            // Cargar registros
            updateRecordsDisplay();
            
            // Agregar un campo de teléfono por defecto
            addPhoneField();
        });
        
        // ===== FUNCIONES DEL MODAL =====
        function openNewRecordModal() {
            editingId = null;
            document.getElementById('recordModal').classList.add('active');
            document.getElementById('recordForm').reset();
            document.querySelector('.modal-title').textContent = 'Nuevo Registro';
            document.querySelector('.submit-btn span').textContent = 'Agregar Registro';
            
            // Limpiar teléfonos y agregar uno vacío
            const phonesContainer = document.getElementById('phonesContainer');
            phonesContainer.innerHTML = '';
            addPhoneField();
            
            // Resetear monto
            document.querySelector('.amount-input').value = '0.00';
        }
        
        function closeModal() {
            document.getElementById('recordModal').classList.remove('active');
        }
        
        function addPhoneField(phoneNumber = '') {
            phoneCount++;
            const phonesContainer = document.getElementById('phonesContainer');
            
            const phoneDiv = document.createElement('div');
            phoneDiv.className = 'phone-input-group';
            phoneDiv.innerHTML = `
                <input type="text" class="phone-input" placeholder="Número de teléfono" value="${phoneNumber}" required>
                ${phoneCount > 1 ? '<button type="button" class="remove-phone-btn" onclick="removePhoneField(this)"><i class="fas fa-times"></i></button>' : ''}
            `;
            
            phonesContainer.appendChild(phoneDiv);
        }
        
        function removePhoneField(button) {
            const phoneGroup = button.parentElement;
            phoneGroup.remove();
        }
        
        // ===== FUNCIONES DE GESTIÓN DE REGISTROS =====
        function saveRecord() {
            // Obtener datos del formulario
            const address = document.querySelector('#recordForm .form-input').value.trim();
            const phoneInputs = document.querySelectorAll('.phone-input');
            const phones = Array.from(phoneInputs)
                .map(input => input.value.trim())
                .filter(phone => phone !== '');
            const amount = parseFloat(document.querySelector('.amount-input').value) || 0;
            const notes = document.querySelector('.form-textarea').value.trim();
            
            // Validaciones básicas
            if (!address) {
                alert('Por favor ingrese una dirección');
                return;
            }
            
            if (phones.length === 0) {
                alert('Por favor agregue al menos un teléfono');
                return;
            }
            
            if (editingId) {
                // Editar registro existente
                const index = records.findIndex(r => r.id === editingId);
                if (index !== -1) {
                    records[index] = {
                        ...records[index],
                        address,
                        phones,
                        amount,
                        notes,
                        updatedAt: new Date().toISOString()
                    };
                }
            } else {
                // Crear nuevo registro
                const newId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
                const newRecord = {
                    id: newId,
                    address,
                    phones,
                    amount,
                    notes,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                records.push(newRecord);
            }
            
            // Cerrar modal y actualizar vista
            closeModal();
            updateRecordsDisplay();
            
            // Mostrar mensaje de éxito
            showNotification(editingId ? 'Registro actualizado' : 'Registro agregado');
        }
        
        function editRecord(id) {
            const record = records.find(r => r.id === id);
            if (!record) return;
            
            editingId = id;
            
            // Abrir modal con datos del registro
            document.getElementById('recordModal').classList.add('active');
            document.querySelector('.modal-title').textContent = 'Editar Registro';
            document.querySelector('.submit-btn span').textContent = 'Guardar Cambios';
            
            // Cargar datos en el formulario
            document.querySelector('#recordForm .form-input').value = record.address;
            
            // Cargar teléfonos
            const phonesContainer = document.getElementById('phonesContainer');
            phonesContainer.innerHTML = '';
            record.phones.forEach(phone => addPhoneField(phone));
            
            // Si no hay teléfonos, agregar uno vacío
            if (record.phones.length === 0) addPhoneField();
            
            // Cargar monto y notas
            document.querySelector('.amount-input').value = record.amount.toFixed(2);
            document.querySelector('.form-textarea').value = record.notes || '';
        }
        
        function deleteRecord(id) {
            if (!confirm('¿Está seguro de eliminar este registro?')) return;
            
            records = records.filter(r => r.id !== id);
            updateRecordsDisplay();
            showNotification('Registro eliminado');
        }
        
        function filterRecords() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            
            if (!searchTerm) {
                updateRecordsDisplay();
                return;
            }
            
            const filteredRecords = records.filter(record => {
                const addressMatch = record.address.toLowerCase().includes(searchTerm);
                const phoneMatch = record.phones.some(phone => 
                    phone.toLowerCase().includes(searchTerm)
                );
                return addressMatch || phoneMatch;
            });
            
            renderRecords(filteredRecords);
        }
        
        function updateRecordsDisplay() {
            renderRecords(records);
            document.getElementById('totalValue').textContent = records.length;
        }
        
        function renderRecords(recordsToRender) {
            const container = document.getElementById('recordsContainer');
            
            if (recordsToRender.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox empty-icon"></i>
                        <h3 class="empty-title">No hay registros</h3>
                        <p class="empty-description">Comienza agregando tu primer registro usando el botón "+"</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            
            recordsToRender.forEach(record => {
                const amountFormatted = new Intl.NumberFormat('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                    minimumFractionDigits: 2
                }).format(record.amount);
                
                html += `
                    <div class="record-card fade-in">
                        <div class="address-section">
                            <div class="section-label">DIRECCIÓN</div>
                            <div class="address-text">${record.address}</div>
                        </div>
                        
                        <div class="phones-section">
                            <div class="section-label">TELÉFONOS</div>
                            <div class="phones-list">
                                ${record.phones.map(phone => `
                                    <div class="phone-item">
                                        <i class="fas fa-phone phone-icon"></i>
                                        <span class="phone-number">${phone}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="amount-section">
                            <div class="amount-label">MONTO IMPAGO</div>
                            <div class="amount-value">${amountFormatted}</div>
                        </div>
                        
                        <div class="actions-section">
                            <button class="action-btn edit-btn" onclick="editRecord(${record.id})">
                                <i class="fas fa-edit"></i>
                                <span>Editar</span>
                            </button>
                            <button class="action-btn delete-btn" onclick="deleteRecord(${record.id})">
                                <i class="fas fa-trash"></i>
                                <span>Eliminar</span>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        }
        
        function showNotification(message) {
            // Crear notificación temporal
            const notification = document.createElement('div');
            notification.className = 'record-card';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                background-color: var(--accent-primary);
                color: white;
                padding: 15px 20px;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease;
            `;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // Remover después de 3 segundos
            setTimeout(() => {
                notification.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
        
        // ===== EVENT LISTENERS =====
        // Cerrar modal haciendo click fuera
        document.getElementById('recordModal').addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
        
        // Cerrar modal con ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeModal();
        });
    </script>
