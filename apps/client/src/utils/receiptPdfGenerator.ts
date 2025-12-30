import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReceiptData {
    id: string;
    date: string | Date;
    amount: number;
    concept: string; // 'PAYMENT', 'SALE', etc.
    description: string;
    entityName: string; // Nombre del Cliente o Proveedor
    type: 'client' | 'provider'; // Para saber el título
}

export const generateReceiptPDF = (data: ReceiptData, settings: any) => {
    const doc = new jsPDF();
    const isClient = data.type === 'client';
    
    // TÍTULO DEL DOCUMENTO
    const title = isClient ? 'RECIBO DE COBRO' : 'ORDEN DE PAGO';
    // Si es cobro es "X" (Provisorio) o "A/B" según fiscalidad. Usaremos "X" o "Recibo" genérico interno.
    
    // --- FUNCIÓN PARA DIBUJAR UNA COPIA (ORIGINAL / DUPLICADO) ---
    const drawReceipt = (startY: number, label: string) => {
        const pageWidth = doc.internal.pageSize.width;
        
        // Marco General
        doc.setDrawColor(0);
        doc.setLineWidth(0.1);
        doc.rect(10, startY, pageWidth - 20, 130); // Caja contenedora

        // Cabecera Empresa
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text((settings?.fantasy_name || 'MI EMPRESA').toUpperCase(), 15, startY + 15);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (settings?.address) doc.text(settings.address, 15, startY + 22);
        if (settings?.phone) doc.text(`Tel: ${settings.phone}`, 15, startY + 27);

        // Cabecera Documento (Derecha)
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(title, pageWidth - 15, startY + 15, { align: 'right' });
        
        doc.setFontSize(12);
        doc.text(`Nº: ${data.id.substring(0, 8).toUpperCase()}`, pageWidth - 15, startY + 25, { align: 'right' });
        doc.text(`Fecha: ${new Date(data.date).toLocaleDateString('es-AR')}`, pageWidth - 15, startY + 32, { align: 'right' });

        // Línea divisoria cabecera
        doc.line(10, startY + 40, pageWidth - 10, startY + 40);

        // DATOS DEL RECEPTOR/EMISOR
        doc.setFontSize(11);
        doc.text(isClient ? 'Recibimos de:' : 'Pagamos a:', 15, startY + 50);
        doc.setFont('helvetica', 'bold');
        doc.text(data.entityName.toUpperCase(), 45, startY + 50);

        doc.setFont('helvetica', 'normal');
        doc.text('La suma de pesos:', 15, startY + 60);
        doc.setFont('helvetica', 'bold');
        doc.text(`$ ${Number(data.amount).toLocaleString('es-AR')}`, 50, startY + 60);

        doc.setFont('helvetica', 'normal');
        doc.text('En concepto de:', 15, startY + 70);
        doc.text(data.description || (isClient ? 'Pago a cuenta' : 'Pago a proveedor'), 50, startY + 70);

        // --- SELLO "PAGADO" / "COBRADO" ---
        doc.setDrawColor(isClient ? 0 : 200, isClient ? 150 : 0, 0); // Verde para cobro, Rojo para pago
        doc.setLineWidth(1);
        const stampColor = isClient ? [0, 150, 0] : [200, 0, 0];
        
        // Dibujar recuadro del sello
        doc.roundedRect(pageWidth - 60, startY + 55, 40, 15, 3, 3);
        
        doc.setTextColor(stampColor[0], stampColor[1], stampColor[2]); // Color del texto
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const stampText = isClient ? 'COBRADO' : 'PAGADO';
        doc.text(stampText, pageWidth - 40, startY + 65, { align: 'center' });
        
        // Resetear colores
        doc.setTextColor(0);
        doc.setDrawColor(0);
        doc.setLineWidth(0.1);

        // FIRMA
        doc.line(pageWidth - 80, startY + 110, pageWidth - 20, startY + 110);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Firma y Aclaración', pageWidth - 50, startY + 115, { align: 'center' });

        // Etiqueta (Original/Duplicado)
        doc.setFontSize(8);
        doc.text(label, 15, startY + 125);
    };

    // Generar dos copias en la misma hoja A4
    drawReceipt(10, 'ORIGINAL');
    
    // Línea de corte
    doc.setLineDash([2, 2], 0);
    doc.line(0, 148, 210, 148);
    doc.setLineDash([], 0);

    drawReceipt(158, 'DUPLICADO'); // Mitad de hoja para abajo aprox

    // Guardar
    const fileName = `${title}_${data.entityName}_${new Date().getTime()}.pdf`;
    doc.save(fileName);
};