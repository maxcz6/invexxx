/**
 * Sistema de Gestión de Inventario
 * Versión mejorada con mejores prácticas y manejo de errores
 */

class InventoryManager {
  constructor() {
    this.supabaseUrl = "https://ekqcllkizcpdfnbnmean.supabase.co";
    this.supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcWNsbGtpemNwZGZuYm5tZWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1Njc5ODksImV4cCI6MjA2NTE0Mzk4OX0.4f3oyXY6cg2436L7NZn3BO3QqMFo2ehdEPdwAfQCMeQ";
    this.supabase = null;
    this.isEditing = false;
    this.editingId = null;
    this.tabla = null;
    
    // Constantes de configuración
    this.STOCK_MINIMO = 10;
    this.ALERT_DURATION = 2000; // Cambiado a 2 segundos
    this.MAX_PRODUCT_NAME_LENGTH = 100;
    this.MAX_CATEGORY_LENGTH = 50;
  }

  /**
   * Inicializa la aplicación
   */
  async init() {
    try {
      await this.initializeSupabase();
      this.initializeDOMElements();
      this.setupEventListeners();
      await this.cargarInventario();
      this.showAlert("Sistema inicializado correctamente", "success");
    } catch (error) {
      this.handleError("Error al inicializar la aplicación", error);
    }
  }

  /**
   * Inicializa la conexión con Supabase
   */
  async initializeSupabase() {
    try {
      if (!window.supabase) {
        throw new Error("Supabase no está disponible. Verifica que la librería esté cargada correctamente.");
      }
      
      this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
      
      // Verificar conexión
      const { error } = await this.supabase.from("inventario").select("id").limit(1);
      if (error) {
        throw new Error(`Error de conexión con la base de datos: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Fallo al conectar con Supabase: ${error.message}`);
    }
  }

  /**
   * Inicializa elementos del DOM
   */
  initializeDOMElements() {
    this.tabla = document.getElementById("tablaInventario");
    if (!this.tabla) {
      throw new Error("No se encontró el elemento 'tablaInventario' en el DOM");
    }

    // Verificar otros elementos críticos
    const requiredElements = [
      "formAgregar", "producto", "stock", "categoria", 
      "precio_unit", "totalProducts", "totalStock", 
      "totalValue", "lowStockItems"
    ];

    for (const elementId of requiredElements) {
      if (!document.getElementById(elementId)) {
        throw new Error(`Elemento requerido '${elementId}' no encontrado en el DOM`);
      }
    }
  }

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    const formAgregar = document.getElementById("formAgregar");
    const formEliminar = document.getElementById("formEliminar");

    if (formAgregar) {
      formAgregar.addEventListener("submit", (e) => this.handleAddProduct(e));
    }

    if (formEliminar) {
      formEliminar.addEventListener("submit", (e) => this.handleDeleteProduct(e));
    }

    // Validación en tiempo real
    this.setupRealTimeValidation();
  }

  /**
   * Configura validación en tiempo real
   */
  setupRealTimeValidation() {
    const productoInput = document.getElementById("producto");
    const stockInput = document.getElementById("stock");
    const precioInput = document.getElementById("precio_unit");

    if (productoInput) {
      productoInput.addEventListener("input", () => this.validateProductName());
    }

    if (stockInput) {
      stockInput.addEventListener("input", () => this.validateStock());
    }

    if (precioInput) {
      precioInput.addEventListener("input", () => this.validatePrice());
    }
  }

  /**
   * Valida el nombre del producto
   */
  validateProductName() {
    const input = document.getElementById("producto");
    const value = input.value.trim();

    if (value.length === 0) {
      this.setInputError(input, "El nombre del producto es requerido");
      return false;
    }

    if (value.length > this.MAX_PRODUCT_NAME_LENGTH) {
      this.setInputError(input, `El nombre no puede exceder ${this.MAX_PRODUCT_NAME_LENGTH} caracteres`);
      return false;
    }

    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-_]+$/.test(value)) {
      this.setInputError(input, "El nombre solo puede contener letras, números, espacios y guiones");
      return false;
    }

    this.clearInputError(input);
    return true;
  }

  /**
   * Valida el stock
   */
  validateStock() {
    const input = document.getElementById("stock");
    const value = parseInt(input.value);

    if (isNaN(value) || value < 0) {
      this.setInputError(input, "El stock debe ser un número positivo");
      return false;
    }

    if (value > 999999) {
      this.setInputError(input, "El stock no puede exceder 999,999 unidades");
      return false;
    }

    if (value < this.STOCK_MINIMO) {
      this.setInputWarning(input, `⚠️ Stock bajo: Se recomienda mantener al menos ${this.STOCK_MINIMO} unidades`);
    } else {
      this.clearInputError(input);
    }

    return true;
  }

  /**
   * Valida el precio
   */
  validatePrice() {
    const input = document.getElementById("precio_unit");
    const value = parseFloat(input.value);

    if (isNaN(value) || value < 0) {
      this.setInputError(input, "El precio debe ser un número positivo");
      return false;
    }

    if (value > 999999.99) {
      this.setInputError(input, "El precio no puede exceder S/. 999,999.99");
      return false;
    }

    this.clearInputError(input);
    return true;
  }

  /**
   * Establece error en input
   */
  setInputError(input, message) {
    input.classList.add("error");
    input.classList.remove("warning");
    this.setInputMessage(input, message, "error");
  }

  /**
   * Establece advertencia en input
   */
  setInputWarning(input, message) {
    input.classList.add("warning");
    input.classList.remove("error");
    this.setInputMessage(input, message, "warning");
  }

  /**
   * Limpia error/advertencia de input
   */
  clearInputError(input) {
    input.classList.remove("error", "warning");
    this.clearInputMessage(input);
  }

  /**
   * Establece mensaje en input
   */
  setInputMessage(input, message, type) {
    let messageElement = input.parentNode.querySelector('.input-message');
    if (!messageElement) {
      messageElement = document.createElement('div');
      messageElement.className = 'input-message';
      input.parentNode.appendChild(messageElement);
    }
    messageElement.textContent = message;
    messageElement.className = `input-message ${type}`;
  }

  /**
   * Limpia mensaje de input
   */
  clearInputMessage(input) {
    const messageElement = input.parentNode.querySelector('.input-message');
    if (messageElement) {
      messageElement.remove();
    }
  }

  /**
   * Ofusca ID para mostrar
   */
  ofuscarID(id) {
    if (!id || typeof id !== 'string') {
      return "ID inválido";
    }
    return id.length > 8 ? `${id.slice(0, 4)}...${id.slice(-4)}` : id;
  }

  /**
   * Muestra alerta al usuario
   */
  showAlert(message, type = 'info', duration = this.ALERT_DURATION) {
    try {
      // Remover alertas anteriores del mismo tipo
      const existingAlerts = document.querySelectorAll(`.alert-${type}`);
      existingAlerts.forEach(alert => alert.remove());

      const alertDiv = document.createElement('div');
      alertDiv.className = `alert alert-${type}`;
      alertDiv.innerHTML = `
        <span>${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">×</button>
      `;

      const container = document.querySelector('.container') || document.body;
      container.insertBefore(alertDiv, container.firstChild);

      // Auto-remover después del tiempo especificado
      setTimeout(() => {
        if (alertDiv.parentNode) {
          alertDiv.remove();
        }
      }, duration);

    } catch (error) {
      console.error("Error al mostrar alerta:", error);
    }
  }

  /**
   * Muestra modal personalizado
   */
  showModal(title, message, type = 'info') {
    // Remover modal existente si hay uno
    const existingModal = document.getElementById('customModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Crear modal
    const modal = document.createElement('div');
    modal.id = 'customModal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()">
        <div class="modal-content ${type}" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            <button class="modal-close" onclick="this.closest('#customModal').remove()">×</button>
          </div>
          <div class="modal-body">
            <div class="modal-icon">
              ${type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}
            </div>
            <p>${message}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" onclick="this.closest('#customModal').remove()">
              Entendido
            </button>
          </div>
        </div>
      </div>
    `;

    // Agregar estilos del modal
    if (!document.getElementById('modalStyles')) {
      const styles = document.createElement('style');
      styles.id = 'modalStyles';
      styles.textContent = `
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }
        
        .modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          max-width: 400px;
          width: 90%;
          animation: slideIn 0.3s ease;
        }
        
        .modal-content.error {
          border-top: 4px solid #dc3545;
        }
        
        .modal-content.success {
          border-top: 4px solid #28a745;
        }
        
        .modal-content.info {
          border-top: 4px solid #17a2b8;
        }
        
        .modal-header {
          padding: 20px 20px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #eee;
        }
        
        .modal-title {
          margin: 0;
          color: #333;
          font-size: 1.2em;
        }
        
        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .modal-close:hover {
          color: #333;
          background: #f5f5f5;
          border-radius: 50%;
        }
        
        .modal-body {
          padding: 20px;
          text-align: center;
        }
        
        .modal-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }
        
        .modal-body p {
          margin: 0;
          color: #666;
          line-height: 1.5;
        }
        
        .modal-footer {
          padding: 10px 20px 20px;
          text-align: center;
        }
        
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s ease;
        }
        
        .btn-primary {
          background: #007bff;
          color: white;
        }
        
        .btn-primary:hover {
          background: #0056b3;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { transform: translateY(-50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(modal);

    // Focus en el botón para accesibilidad
    setTimeout(() => {
      const button = modal.querySelector('.btn-primary');
      if (button) button.focus();
    }, 100);
  }
  handleError(context, error) {
    console.error(`${context}:`, error);
    
    let userMessage = context;
    if (error.message) {
      userMessage += `: ${error.message}`;
    }

    // Errores específicos de Supabase
    if (error.code === 'PGRST116') {
      userMessage += " (No se encontraron registros)";
    } else if (error.code === '23505') {
      userMessage += " (Ya existe un registro con estos datos)";
    } else if (error.message.includes('JWT')) {
      userMessage += " (Sesión expirada, recarga la página)";
    } else if (error.message.includes('network')) {
      userMessage += " (Verifica tu conexión a internet)";
    }

    this.showAlert(userMessage, "error");
  }

  /**
   * Actualiza estadísticas del inventario
   */
  updateStats(data) {
    try {
      if (!Array.isArray(data)) {
        throw new Error("Los datos del inventario no son válidos");
      }

      const stats = {
        totalProducts: data.length,
        totalStock: data.reduce((sum, item) => sum + (item.stock || 0), 0),
        totalValue: data.reduce((sum, item) => sum + (item.valor_total || 0), 0),
        lowStockItems: data.filter(item => (item.stock || 0) < this.STOCK_MINIMO).length
      };

      // Actualizar elementos del DOM
      this.updateStatElement('totalProducts', stats.totalProducts);
      this.updateStatElement('totalStock', stats.totalStock.toLocaleString());
      this.updateStatElement('totalValue', `S/. ${stats.totalValue.toFixed(2)}`);
      this.updateStatElement('lowStockItems', stats.lowStockItems);

      // Mostrar advertencia si hay productos con stock bajo
      if (stats.lowStockItems > 0) {
        this.showAlert(
          `⚠️ ${stats.lowStockItems} producto(s) con stock bajo (menos de ${this.STOCK_MINIMO} unidades)`,
          "warning"
        );
      }

    } catch (error) {
      this.handleError("Error al actualizar estadísticas", error);
    }
  }

  /**
   * Actualiza un elemento de estadística
   */
  updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    } else {
      console.warn(`Elemento de estadística '${elementId}' no encontrado`);
    }
  }

  /**
   * Carga el inventario desde la base de datos
   */
  async cargarInventario() {
    try {
      this.showAlert("Cargando inventario...", "info", 1000);
      
      const { data, error } = await this.supabase
        .from("inventario")
        .select("*")
        .order('producto', { ascending: true });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        this.tabla.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 20px; color: #666;">
              📦 No hay productos en el inventario. ¡Agrega el primero!
            </td>
          </tr>
        `;
        this.updateStats([]);
        return;
      }

      this.renderInventoryTable(data);
      this.updateStats(data);

    } catch (error) {
      this.handleError("Error al cargar el inventario", error);
    }
  }

  /**
   * Renderiza la tabla del inventario
   */
  renderInventoryTable(data) {
    try {
      this.tabla.innerHTML = "";
      
      data.forEach(item => {
        if (!item.id || !item.producto) {
          console.warn("Producto con datos incompletos:", item);
          return;
        }

        const fila = document.createElement("tr");
        const stockClass = (item.stock || 0) < this.STOCK_MINIMO ? 
          'style="color: #fd7e14; font-weight: bold;"' : '';

        fila.innerHTML = `
          <td>${this.ofuscarID(item.id)}</td>
          <td title="${item.producto}">${this.truncateText(item.producto, 30)}</td>
          <td ${stockClass}>${item.stock || 0}</td>
          <td>${item.categoria || 'Sin categoría'}</td>
          <td>S/. ${(item.precio_unit || 0).toFixed(2)}</td>
          <td>S/. ${(item.valor_total || 0).toFixed(2)}</td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-icon btn-edit" 
                      onclick="inventoryManager.editarProducto('${item.id}')"
                      title="Editar producto">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-icon btn-delete" 
                      onclick="inventoryManager.eliminarProducto('${item.id}')"
                      title="Eliminar producto">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        
        this.tabla.appendChild(fila);
      });

    } catch (error) {
      this.handleError("Error al renderizar la tabla", error);
    }
  }

  /**
   * Trunca texto si es muy largo
   */
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Maneja el envío del formulario de agregar/editar producto
   */
  async handleAddProduct(e) {
    e.preventDefault();

    try {
      // Validar formulario
      if (!this.validateForm()) {
        this.showAlert("Por favor, corrige los errores en el formulario", "error");
        return;
      }

      const formData = this.getFormData();
      
      if (this.isEditing) {
        await this.updateProduct(formData);
      } else {
        await this.addProduct(formData);
      }

    } catch (error) {
      this.handleError("Error al procesar el formulario", error);
    }
  }

  /**
   * Valida el formulario completo
   */
  validateForm() {
    const validations = [
      this.validateProductName(),
      this.validateStock(),
      this.validatePrice(),
      this.validateCategory()
    ];

    return validations.every(isValid => isValid);
  }

  /**
   * Valida la categoría
   */
  validateCategory() {
    const input = document.getElementById("categoria");
    const value = input.value.trim();

    if (value.length === 0) {
      this.setInputError(input, "La categoría es requerida");
      return false;
    }

    if (value.length > this.MAX_CATEGORY_LENGTH) {
      this.setInputError(input, `La categoría no puede exceder ${this.MAX_CATEGORY_LENGTH} caracteres`);
      return false;
    }

    this.clearInputError(input);
    return true;
  }

  /**
   * Obtiene datos del formulario
   */
  getFormData() {
    const producto = document.getElementById("producto").value.trim();
    const stock = parseInt(document.getElementById("stock").value);
    const categoria = document.getElementById("categoria").value.trim();
    const precio_unit = parseFloat(document.getElementById("precio_unit").value);
    const valor_total = stock * precio_unit;

    return { producto, stock, categoria, precio_unit, valor_total };
  }

  /**
   * Agrega un nuevo producto
   */
  async addProduct(formData) {
    try {
      // Verificar si ya existe un producto con el mismo nombre
      const exists = await this.checkProductExists(formData.producto);
      if (exists) {
        this.showModal(
          'Producto Duplicado',
          `Ya existe un producto con el nombre "${formData.producto}". Por favor, usa un nombre diferente.`,
          'error'
        );
        return;
      }

      const { error } = await this.supabase
        .from("inventario")
        .insert([formData]);

      if (error) {
        throw error;
      }

      await this.cargarInventario();
      this.resetForm();
      this.showAlert("✅ Producto agregado exitosamente", "success");

    } catch (error) {
      this.handleError("Error al agregar el producto", error);
    }
  }

  /**
   * Actualiza un producto existente
   */
  async updateProduct(formData) {
    try {
      // Verificar si ya existe otro producto con el mismo nombre
      const exists = await this.checkProductExists(formData.producto, this.editingId);
      if (exists) {
        this.showModal(
          'Producto Duplicado',
          `Ya existe otro producto con el nombre "${formData.producto}". No se puede actualizar porque generaría un duplicado.`,
          'error'
        );
        return;
      }

      const { error } = await this.supabase
        .from("inventario")
        .update(formData)
        .eq("id", this.editingId);

      if (error) {
        throw error;
      }

      await this.cargarInventario();
      this.resetForm();
      this.showAlert("✅ Producto actualizado exitosamente", "success");

    } catch (error) {
      this.handleError("Error al actualizar el producto", error);
    }
  }

  /**
   * Verifica si un producto ya existe
   */
  async checkProductExists(productName, excludeId = null) {
    try {
      let query = this.supabase
        .from('inventario')
        .select('id, producto')
        .eq('producto', productName);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data && data.length > 0;

    } catch (error) {
      this.handleError("Error al verificar productos existentes", error);
      return false;
    }
  }

  /**
   * Resetea el formulario y el estado de edición
   */
  resetForm() {
    const form = document.getElementById("formAgregar");
    if (form) {
      form.reset();
    }

    // Limpiar mensajes de validación
    const inputs = ['producto', 'stock', 'categoria', 'precio_unit'];
    inputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      if (input) {
        this.clearInputError(input);
      }
    });

    // Resetear estado de edición
    this.isEditing = false;
    this.editingId = null;
    this.updateFormButton();
  }

  /**
   * Actualiza el botón del formulario según el estado
   */
  updateFormButton() {
    const buttonSpan = document.querySelector("#formAgregar button span");
    if (buttonSpan) {
      buttonSpan.innerHTML = this.isEditing ? 
        '<i class="fas fa-sync-alt"></i> Actualizar Producto' :
        '<i class="fas fa-save"></i> Agregar Producto';
    }
  }

  /**
   * Maneja la eliminación de productos por nombre
   */
  async handleDeleteProduct(e) {
    e.preventDefault();

    try {
      const producto = document.getElementById("nombreEliminar").value.trim();

      if (!producto) {
        this.showAlert("Por favor, ingresa el nombre del producto a eliminar", "error");
        return;
      }

      // Verificar si el producto existe
      const { data, error: searchError } = await this.supabase
        .from("inventario")
        .select("id, producto")
        .eq("producto", producto);

      if (searchError) {
        throw searchError;
      }

      if (!data || data.length === 0) {
        this.showAlert(`No se encontró el producto "${producto}"`, "error");
        return;
      }

      if (!confirm(`¿Seguro que deseas eliminar el producto "${producto}"?`)) {
        return;
      }

      const { error } = await this.supabase
        .from("inventario")
        .delete()
        .eq("producto", producto);

      if (error) {
        throw error;
      }

      await this.cargarInventario();
      document.getElementById("formEliminar").reset();
      this.showAlert("✅ Producto eliminado exitosamente", "success");

    } catch (error) {
      this.handleError("Error al eliminar el producto", error);
    }
  }

  /**
   * Elimina un producto por ID
   */
  async eliminarProducto(id) {
    try {
      if (!id) {
        throw new Error("ID de producto no válido");
      }

      // Obtener información del producto antes de eliminar
      const { data: productData, error: fetchError } = await this.supabase
        .from("inventario")
        .select("producto")
        .eq("id", id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const productName = productData?.producto || "producto desconocido";

      if (!confirm(`¿Seguro que deseas eliminar "${productName}"?`)) {
        return;
      }

      const { error } = await this.supabase
        .from("inventario")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      await this.cargarInventario();
      this.showAlert(`✅ "${productName}" eliminado exitosamente`, "success");

    } catch (error) {
      this.handleError("Error al eliminar el producto", error);
    }
  }

  /**
   * Edita un producto
   */
  async editarProducto(id) {
    try {
      if (!id) {
        throw new Error("ID de producto no válido");
      }

      const { data, error } = await this.supabase
        .from("inventario")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Producto no encontrado");
      }

      // Rellenar el formulario con los datos
      document.getElementById("producto").value = data.producto || '';
      document.getElementById("stock").value = data.stock || 0;
      document.getElementById("categoria").value = data.categoria || '';
      document.getElementById("precio_unit").value = data.precio_unit || 0;

      // Configurar modo de edición
      this.isEditing = true;
      this.editingId = id;
      this.updateFormButton();

      // Scroll al formulario
      document.getElementById("formAgregar").scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      this.showAlert(`Editando producto: ${data.producto}`, "info");

    } catch (error) {
      this.handleError("Error al cargar el producto para edición", error);
    }
  }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", async () => {
  try {
    window.inventoryManager = new InventoryManager();
    await window.inventoryManager.init();
  } catch (error) {
    console.error("Error fatal al inicializar la aplicación:", error);
    alert("Error crítico: No se pudo inicializar la aplicación. Revisa la consola para más detalles.");
  }
});

// Exponer funciones globales para compatibilidad con HTML onclick
window.eliminarProducto = (id) => window.inventoryManager?.eliminarProducto(id);
window.editarProducto = (id) => window.inventoryManager?.editarProducto(id);


