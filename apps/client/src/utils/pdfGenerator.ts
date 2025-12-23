import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper para formatear fecha
const formatDate = (dateString: any) => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    } catch { return '-'; }
};

export const generatePurchasePDF = (purchase: any, settings: any) => {
    const doc = new jsPDF();

    // 1. OBTENER DATOS (Con fallbacks inteligentes)
    // Usamos el Nombre de Fantasía como principal, o la Razón Social si no hay fantasía.
    const mainName = settings?.fantasy_name || settings?.legal_name || 'MI EMPRESA';

    // La dirección y CUIT que acabamos de agregar
    const companyAddress = settings?.address || '';
    const companyCuit = settings?.tax_id ? `CUIT: ${settings.tax_id}` : '';
    const companyPhone = settings?.phone ? `Tel: ${settings.phone}` : '';

    // --- CABECERA ---
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(mainName.toUpperCase(), 14, 20); // Nombre Grande

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);

    let yPos = 28;
    // Si hay Razón Social y es distinta al nombre de fantasía, la mostramos abajo chiquita
    if (settings?.legal_name && settings?.legal_name !== settings?.fantasy_name) {
        doc.text(settings.legal_name, 14, yPos);
        yPos += 5;
    }

    if (companyAddress) {
        doc.text(companyAddress, 14, yPos);
        yPos += 5;
    }
    if (companyCuit) {
        doc.text(companyCuit, 14, yPos);
        yPos += 5;
    }
    if (companyPhone) {
        doc.text(companyPhone, 14, yPos);
    }

    // Derecha: Título y Datos de la Orden
    doc.setFontSize(22);
    doc.setTextColor(0, 80, 160);
    doc.text('ORDEN DE COMPRA', 195, 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Fecha: ${formatDate(purchase.date)}`, 195, 30, { align: 'right' });

    // 👇 LÓGICA QUISQUILLOSA DE IDENTIFICACIÓN
    if (purchase.invoice_number) {
        // Si ya tiene factura cargada (Confirmado)
        doc.text(`Factura Prov: ${purchase.invoice_number}`, 195, 35, { align: 'right' });
    } else {
        // Si es Pedido/Borrador, mostramos el ID interno (los últimos 8 caracteres para que sea legible)
        const shortId = purchase.id ? purchase.id.slice(-8).toUpperCase() : '---';
        doc.setFontSize(11); // Un pelín más grande para que destaque
        doc.setTextColor(60, 60, 60);
        doc.text(`NRO. ORDEN: #${shortId}`, 195, 35, { align: 'right' });
    }

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 45, 196, 45);

    // --- 2. DATOS DEL PROVEEDOR ---
    const providerName = purchase.provider?.name || 'Proveedor General';
    const providerCuit = purchase.provider?.cuit ? `CUIT: ${purchase.provider.cuit}` : '';
    const providerAddress = purchase.provider?.address || '';

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('SOLICITADO A:', 14, 55);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(providerName, 14, 62); // Nombre Proveedor

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(providerCuit, 14, 68);
    if (providerAddress) doc.text(providerAddress, 14, 73);


    // --- 3. TABLA DE ÍTEMS (CIEGA: SIN PRECIOS) ---
    // Columnas simples para el proveedor
    const tableColumn = ["CÓDIGO", "DESCRIPCIÓN / PRODUCTO", "CANTIDAD"];
    const tableRows: any[] = [];

    const itemsToPrint = purchase.details || purchase.items || [];

    itemsToPrint.forEach((item: any) => {
        // Intentamos buscar el código: SKU, Barcode o ID
        const code = item.product?.sku || item.product?.barcode || '-';
        // Nombre del producto
        const name = item.product?.name || item.product_name || 'Ítem desconocido';

        const rowData = [
            code,
            name,
            item.quantity // Solo cantidad
        ];
        tableRows.push(rowData);
    });

    // Generamos la tabla
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 85,
        theme: 'grid', // 'striped', 'grid', 'plain'
        styles: {
            fontSize: 10,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [40, 40, 40], // Cabecera gris oscuro/negra
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 30 }, // Código
            1: { halign: 'left' },                  // Producto (ocupa lo que sobre)
            2: { halign: 'center', cellWidth: 30 }  // Cantidad
        },
    });

    // --- 4. PIE DE PÁGINA / OBSERVACIONES ---
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    if (purchase.observation) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('Observaciones / Notas del Pedido:', 14, finalY);
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(purchase.observation, 14, finalY + 6);
    }

    // Mensaje final profesional
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Documento generado electrónicamente - Orden de Pedido', 105, pageHeight - 10, { align: 'center' });

    // Guardar PDF
    const safeName = providerName.replace(/[^a-z0-9]/gi, '_').substring(0, 15);
    const fileName = `Pedido_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};