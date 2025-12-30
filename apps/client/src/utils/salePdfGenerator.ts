import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// 1. FUNCIÓN CORE: Solo genera el objeto PDF (No guarda ni descarga)
export const generateSalePDF = (saleData: any, items: any[], settings: any) => {
    const isBudget = saleData.type === 'PRESUPUESTO';
    let format = 'A4';

    // Si es Venta y la config dice 80mm, usamos formato ticket
    if (!isBudget && settings?.printer_format === '80mm') {
        format = '80mm';
    }

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: format === '80mm' ? [80, 297] : 'a4' 
    });

    if (format === '80mm') {
        generateTicket80mm(doc, saleData, items, settings, isBudget);
    } else {
        generateA4(doc, saleData, items, settings, isBudget);
    }

    return doc;
};

// 2. HELPER: Obtener URL para el Iframe (Vista Previa)
export const getPdfUrl = (doc: jsPDF) => {
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
};

// 3. HELPER: Descargar (Comportamiento anterior)
export const downloadPdf = (doc: jsPDF, filename: string) => {
    doc.save(filename);
};

// --- (MANTENER LAS FUNCIONES generateTicket80mm Y generateA4 IGUAL QUE ANTES) ---
// Copia aquí abajo las funciones generateTicket80mm y generateA4 que ya tenías
// o avísame si las necesitas de nuevo.

const generateTicket80mm = (doc: jsPDF, data: any, items: any[], settings: any, isBudget: boolean) => {
    const margin = 2;
    let y = 5;
    
    // Helper para centrar
    const centerText = (text: string, yPos: number, size = 10, weight = 'normal') => {
        doc.setFontSize(size);
        doc.setFont('helvetica', weight);
        doc.text(text || '', 40, yPos, { align: 'center', maxWidth: 75 });
    };

    // 1. CABECERA
    centerText(settings?.fantasy_name || 'MI NEGOCIO', y, 12, 'bold');
    y += 5;
    if (settings?.address) { centerText(settings.address, y, 8); y += 4; }
    if (settings?.phone) { centerText(`Tel: ${settings.phone}`, y, 8); y += 4; }
    
    doc.setDrawColor(0);
    doc.line(margin, y, 78, y);
    y += 5;

    // 2. DATOS
    centerText(isBudget ? 'PRESUPUESTO' : 'TICKET DE VENTA', y, 10, 'bold');
    y += 5;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`, margin, y);
    y += 4;
    
    // 3. ÍTEMS
    const tableBody = items.map(item => [
        `${item.quantity} x ${item.name.substring(0, 15)}`, 
        `$${item.subtotal.toLocaleString('es-AR')}`
    ]);

    autoTable(doc, {
        startY: y,
        head: [['Cant/Detalle', 'Total']],
        body: tableBody,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 1 },
        columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 20, halign: 'right' } },
        margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // 4. TOTAL
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: $${data.total.toLocaleString('es-AR')}`, 75, y, { align: 'right' });
};

const generateA4 = (doc: jsPDF, data: any, items: any[], settings: any, isBudget: boolean) => {
    const pageWidth = doc.internal.pageSize.width;
    
    // CABECERA
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text((settings?.fantasy_name || 'MI EMPRESA').toUpperCase(), 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    
    let yHeader = 26;
    if (settings?.address) { doc.text(settings.address, 14, yHeader); yHeader += 5; }
    if (settings?.phone) { doc.text(`Tel: ${settings.phone}`, 14, yHeader); yHeader += 5; }

    // Título
    doc.setFontSize(24);
    doc.setTextColor(isBudget ? 230 : 0, isBudget ? 120 : 0, 0); 
    const title = isBudget ? 'PRESUPUESTO' : 'TICKET DE VENTA';
    doc.text(title, pageWidth - 14, 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, pageWidth - 14, 30, { align: 'right' });
    if(data.invoice_number) doc.text(`N°: #${data.invoice_number}`, pageWidth - 14, 35, { align: 'right' });

    // Cliente
    doc.setDrawColor(200);
    doc.line(14, 45, pageWidth - 14, 45);
    doc.text(`Cliente: ${data.customer_name || 'Consumidor Final'}`, 14, 52);
    if(data.customer_tax_id) doc.text(`CUIT/DNI: ${data.customer_tax_id}`, 14, 57);

    // Tabla
    const tableRows = items.map(item => [
        item.quantity,
        item.name,
        `$${item.price.toLocaleString('es-AR')}`,
        `$${item.subtotal.toLocaleString('es-AR')}`
    ]);

    autoTable(doc, {
        startY: 65,
        head: [['Cant.', 'Descripción', 'Unitario', 'Subtotal']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: isBudget ? [230, 120, 0] : [40, 40, 40] }
    });

    // Total
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: $${data.total.toLocaleString('es-AR')}`, pageWidth - 14, finalY, { align: 'right' });
};