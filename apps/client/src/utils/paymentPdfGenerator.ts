import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePaymentPDF = (paymentData: any, provider: any, userSettings: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- CABECERA ---
    const companyName = userSettings?.fantasy_name || userSettings?.legal_name || 'MI EMPRESA';
    doc.setFontSize(18);
    doc.text(companyName.toUpperCase(), 14, 20);

    doc.setFontSize(22);
    doc.setTextColor(0, 80, 160);
    doc.text('ORDEN DE PAGO', pageWidth - 14, 20, { align: 'right' });

    // Info del Pago
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Fecha: ${new Date(paymentData.date).toLocaleDateString('es-AR')}`, pageWidth - 14, 30, { align: 'right' });
    // Si tuviéramos el número real de orden (que viene del backend), lo ponemos aquí.
    // doc.text(`N°: ${paymentData.number}`, pageWidth - 14, 35, { align: 'right' });

    // Info Proveedor
    doc.setDrawColor(200);
    doc.line(14, 40, pageWidth - 14, 40);

    doc.text('PAGADO A:', 14, 50);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(provider.name, 14, 56);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (provider.cuit) doc.text(`CUIT: ${provider.cuit}`, 14, 62);

    // --- TABLA DE DETALLE ---
    const rows = [];

    // Efectivo
    if (paymentData.cash_amount > 0) {
        rows.push(['Efectivo', '-', `$${Number(paymentData.cash_amount).toLocaleString('es-AR')}`]);
    }
    // Transferencia
    if (paymentData.transfer_amount > 0) {
        const ref = paymentData.transfer_reference || '-';
        rows.push(['Transferencia Bancaria', ref, `$${Number(paymentData.transfer_amount).toLocaleString('es-AR')}`]);
    }
    // Cheques Terceros
    paymentData.third_party_checks?.forEach((c: any) => {
        rows.push([`Cheque Tercero (${c.bank_name})`, `#${c.number}`, `$${Number(c.amount).toLocaleString('es-AR')}`]);
    });
    // Cheques Propios
    paymentData.own_checks?.forEach((c: any) => {
        rows.push([`Cheque Propio (${c.bank_name})`, `#${c.number}`, `$${Number(c.amount).toLocaleString('es-AR')}`]);
    });

    // Total
    const total = rows.reduce((acc, row) => {
        const val = row[2].replace('$', '').replace(/\./g, '').replace(',', '.');
        return acc + parseFloat(val);
    }, 0);

    autoTable(doc, {
        startY: 70,
        head: [['Forma de Pago', 'Referencia / Nro', 'Importe']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] },
        columnStyles: { 2: { halign: 'right' } }
    });

    // Total Final
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL PAGADO: $${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY, { align: 'right' });

    // Firmas
    doc.setDrawColor(150);
    doc.line(14, finalY + 40, 80, finalY + 40); // Firma emisor
    doc.text('Firma Emisor', 14, finalY + 45);

    doc.line(pageWidth - 90, finalY + 40, pageWidth - 14, finalY + 40); // Firma receptor
    doc.text('Recibí Conforme', pageWidth - 90, finalY + 45);

    doc.save(`OrdenPago_${provider.name}_${paymentData.date}.pdf`);
};