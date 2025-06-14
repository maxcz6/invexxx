/**
 * Módulo de Exportación para Sistema de Inventario
 * Archivo: export-functions.js
 */

class ExportManager {
  constructor(inventoryManager) {
    this.inventoryManager = inventoryManager;
    this.supabase = inventoryManager.supabase;
    this.init();
  }

  /**
   * Inicializa el módulo de exportación
   */
  init() {
    this.setupExportListeners();
    this.checkLibraries();
  }

  /**
   * Configura los event listeners para exportación
   */
  setupExportListeners() {
    const exportarExcel = document.getElementById("exportarExcel");
    const exportarPDF = document.getElementById("exportarPDF");

    if (exportarExcel) {
      exportarExcel.addEventListener("click", () => this.exportarExcel());
    }

    if (exportarPDF) {
      exportarPDF.addEventListener("click", () => this.exportarPDF());
    }
  }

  /**
   * Exporta el inventario a Excel
   */
  async exportarExcel() {
    try {
      this.inventoryManager.showAlert("Preparando exportación a Excel...", "info", 1500);

      // Obtener datos del inventario
      const { data, error } = await this.supabase
        .from("inventario")
        .select("*")
        .order('producto', { ascending: true });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        this.inventoryManager.showAlert("No hay datos para exportar", "warning");
        return;
      }

      // Preparar datos para Excel
      const excelData = data.map(item => ({
        'ID': this.inventoryManager.ofuscarID(item.id),
        'Producto': item.producto || '',
        'Stock': item.stock || 0,
        'Categoría': item.categoria || 'Sin categoría',
        'Precio Unitario': `S/. ${(item.precio_unit || 0).toFixed(2)}`,
        'Valor Total': `S/. ${(item.valor_total || 0).toFixed(2)}`,
        'Fecha Registro': item.created_at ? new Date(item.created_at).toLocaleDateString('es-PE') : 'N/A'
      }));

      // Agregar fila de totales
      const totalStock = data.reduce((sum, item) => sum + (item.stock || 0), 0);
      const totalValue = data.reduce((sum, item) => sum + (item.valor_total || 0), 0);

      excelData.push({
        'ID': '',
        'Producto': 'TOTALES',
        'Stock': totalStock,
        'Categoría': '',
        'Precio Unitario': '',
        'Valor Total': `S/. ${totalValue.toFixed(2)}`,
        'Fecha Registro': ''
      });

      // Crear workbook
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 12 }, // ID
        { wch: 30 }, // Producto
        { wch: 10 }, // Stock
        { wch: 15 }, // Categoría
        { wch: 15 }, // Precio Unitario
        { wch: 15 }, // Valor Total
        { wch: 15 }  // Fecha Registro
      ];
      ws['!cols'] = colWidths;

      // Generar archivo
      const fileName = `Inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      this.inventoryManager.showAlert("✅ Archivo Excel descargado exitosamente", "success");

    } catch (error) {
      this.inventoryManager.handleError("Error al exportar a Excel", error);
    }
  }

  /**
   * Exporta el inventario a PDF
   */
  async exportarPDF() {
    try {
      this.inventoryManager.showAlert("Preparando exportación a PDF...", "info", 1500);

      // Obtener datos del inventario
      const { data, error } = await this.supabase
        .from("inventario")
        .select("*")
        .order('producto', { ascending: true });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        this.inventoryManager.showAlert("No hay datos para exportar", "warning");
        return;
      }

      // Crear nueva instancia de jsPDF
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Configuración del documento
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;

      // Título
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("INVENTARIO DE PRODUCTOS", pageWidth / 2, 30, { align: "center" });

      // Fecha de generación
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const fechaActual = new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Generado el: ${fechaActual}`, pageWidth / 2, 40, { align: "center" });

      // Preparar datos para la tabla
      const tableData = data.map(item => [
        this.inventoryManager.ofuscarID(item.id),
        item.producto || '',
        (item.stock || 0).toString(),
        item.categoria || 'Sin categoría',
        `S/. ${(item.precio_unit || 0).toFixed(2)}`,
        `S/. ${(item.valor_total || 0).toFixed(2)}`
      ]);

      // Agregar fila de totales
      const totalStock = data.reduce((sum, item) => sum + (item.stock || 0), 0);
      const totalValue = data.reduce((sum, item) => sum + (item.valor_total || 0), 0);

      tableData.push([
        '',
        'TOTALES',
        totalStock.toString(),
        '',
        '',
        `S/. ${totalValue.toFixed(2)}`
      ]);

      // Crear tabla con autoTable
      doc.autoTable({
        head: [['ID', 'Producto', 'Stock', 'Categoría', 'Precio Unit.', 'Valor Total']],
        body: tableData,
        startY: 50,
        margin: { top: 50, right: margin, bottom: margin, left: margin },
        styles: {
          fontSize: 10,
          cellPadding: 5,
          overflow: 'linebreak',
          halign: 'left'
        },
        headStyles: {
          fillColor: [52, 152, 219],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 25, halign: 'center' }, // ID
          1: { cellWidth: 45 }, // Producto
          2: { cellWidth: 20, halign: 'center' }, // Stock
          3: { cellWidth: 30 }, // Categoría
          4: { cellWidth: 25, halign: 'right' }, // Precio Unit.
          5: { cellWidth: 30, halign: 'right' } // Valor Total
        },
        didParseCell: function(data) {
          // Resaltar fila de totales
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [230, 230, 230];
          }
          
          // Resaltar stock bajo
          if (data.column.index === 2 && data.row.index < tableData.length - 1) {
            const stockValue = parseInt(data.cell.text[0]);
            if (stockValue < 10) {
              data.cell.styles.textColor = [255, 140, 0];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      // Pie de página
      const finalY = doc.lastAutoTable.finalY + 20;
      if (finalY < pageHeight - 40) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Sistema de Gestión de Inventario", margin, finalY);
        doc.text(`Total de productos: ${data.length}`, margin, finalY + 10);
        doc.text(`Productos con stock bajo: ${data.filter(item => (item.stock || 0) < 10).length}`, margin, finalY + 20);
      }

      // Generar archivo
      const fileName = `Inventario_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      this.inventoryManager.showAlert("✅ Archivo PDF descargado exitosamente", "success");

    } catch (error) {
      this.inventoryManager.handleError("Error al exportar a PDF", error);
    }
  }

  /**
   * Verifica si las librerías necesarias están disponibles
   */
  checkLibraries() {
    const missingLibraries = [];

    if (typeof XLSX === 'undefined') {
      missingLibraries.push('SheetJS (XLSX)');
    }
    
    if (typeof window.jspdf === 'undefined') {
      missingLibraries.push('jsPDF');
    }
    
    if (typeof window.jspdf?.jsPDF?.API?.autoTable === 'undefined') {
      missingLibraries.push('jsPDF AutoTable');
    }

    if (missingLibraries.length > 0) {
      console.error('Librerías faltantes para exportación:', missingLibraries);
      this.inventoryManager.showAlert(
        `⚠️ Funciones de exportación no disponibles. Faltan librerías: ${missingLibraries.join(', ')}`,
        'warning'
      );
      
      // Deshabilitar botones
      this.disableExportButtons();
    }
  }

  /**
   * Deshabilita los botones de exportación si faltan librerías
   */
  disableExportButtons() {
    const exportarExcel = document.getElementById("exportarExcel");
    const exportarPDF = document.getElementById("exportarPDF");

    if (exportarExcel) {
      exportarExcel.disabled = true;
      exportarExcel.title = "Librería XLSX no disponible";
      exportarExcel.style.opacity = "0.5";
      exportarExcel.style.cursor = "not-allowed";
    }

    if (exportarPDF) {
      exportarPDF.disabled = true;
      exportarPDF.title = "Librería jsPDF no disponible";
      exportarPDF.style.opacity = "0.5";
      exportarPDF.style.cursor = "not-allowed";
    }
  }

  /**
   * Exporta datos personalizados (método público para uso externo)
   */
  async exportCustomData(data, filename, format = 'excel') {
    try {
      if (!data || data.length === 0) {
        this.inventoryManager.showAlert("No hay datos para exportar", "warning");
        return;
      }

      if (format === 'excel') {
        await this.exportCustomExcel(data, filename);
      } else if (format === 'pdf') {
        await this.exportCustomPDF(data, filename);
      } else {
        throw new Error("Formato no soportado. Use 'excel' o 'pdf'");
      }

    } catch (error) {
      this.inventoryManager.handleError("Error en exportación personalizada", error);
    }
  }

  /**
   * Exporta datos personalizados a Excel
   */
  async exportCustomExcel(data, filename) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    
    const fileName = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    this.inventoryManager.showAlert("✅ Archivo Excel personalizado descargado", "success");
  }

  /**
   * Exporta datos personalizados a PDF
   */
  async exportCustomPDF(data, filename) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configuración básica
    doc.setFontSize(16);
    doc.text(filename, 20, 20);
    
    // Convertir datos a formato de tabla
    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(header => item[header] || ''));
    
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 30
    });
    
    const fileName = `${filename}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    this.inventoryManager.showAlert("✅ Archivo PDF personalizado descargado", "success");
  }
}

// Inicializar el módulo cuando el inventoryManager esté listo
document.addEventListener("DOMContentLoaded", () => {
  // Esperar a que el inventoryManager esté disponible
  const initExportManager = () => {
    if (window.inventoryManager) {
      window.exportManager = new ExportManager(window.inventoryManager);
      console.log("Módulo de exportación inicializado correctamente");
    } else {
      // Reintentar después de un breve delay
      setTimeout(initExportManager, 500);
    }
  };
  
  initExportManager();
});

// Exponer ExportManager globalmente para uso externo
window.ExportManager = ExportManager;