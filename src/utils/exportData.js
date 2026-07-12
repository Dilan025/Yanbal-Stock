import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportToCSV = async (products) => {
  if (!products || products.length === 0) {
    alert("No hay productos para exportar.");
    return;
  }

  // Crear el libro de trabajo y la hoja
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Inventario Yanbal');

  // Configurar las columnas
  worksheet.columns = [
    { header: 'Nombre del Producto', key: 'name', width: 45 },
    { header: 'Categoría', key: 'category', width: 25 },
    { header: 'Stock', key: 'stock', width: 12 },
    { header: 'Precio Unitario (S/)', key: 'price', width: 22 },
    { header: 'Valor Total (S/)', key: 'total', width: 22 }
  ];

  // Añadir las filas de productos
  products.forEach(p => {
    const price = p.price || 0;
    const totalValue = p.stock * price;
    worksheet.addRow({
      name: p.name,
      category: p.category,
      stock: p.stock,
      price: price,
      total: totalValue
    });
  });

  // Calcular totales
  const totalItems = products.reduce((sum, p) => sum + p.stock, 0);
  const totalCapital = products.reduce((sum, p) => sum + (p.stock * (p.price || 0)), 0);

  // Añadir fila de totales
  const totalRow = worksheet.addRow({
    name: 'TOTALES',
    category: '',
    stock: totalItems,
    price: '',
    total: totalCapital
  });

  // ========== ESTILOS ==========

  // 1. Estilo del Encabezado (Fila 1)
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC0504D' } // Rojo oscuro tipo Yanbal/Excel
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' }, // Texto blanco
      bold: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  });

  // 2. Filtros Automáticos (AutoFilter)
  worksheet.autoFilter = {
    from: 'A1',
    to: 'E1'
  };

  // 3. Estilo para las filas de datos
  products.forEach((_, index) => {
    const row = worksheet.getRow(index + 2); // +2 porque el índice es 0 y la fila 1 es el header
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
  });

  // 4. Estilo de la fila de TOTALES
  totalRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2DCDB' } // Rosa claro
    };
    cell.font = {
      bold: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  });

  // ========== EXPORTAR ==========
  const date = new Date().toISOString().split('T')[0];
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Inventario_Yanbal_${date}.xlsx`);
};
