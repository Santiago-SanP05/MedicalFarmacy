import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { environment } from '../../../environments/environment';
import { Pedido } from '../../shared/models/pedido.model';

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: environment.moneda,
  maximumFractionDigits: 0,
});

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'short',
});

@Injectable({ providedIn: 'root' })
export class PdfService {
  descargarFactura(pedido: Pedido): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margen = 14;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor('#115e59');
    doc.text('MedicalShop', margen, 20);

    doc.setFontSize(11);
    doc.setTextColor('#5b6b7c');
    doc.text('Factura de venta', margen, 27);

    doc.setDrawColor('#dfe6ea');
    doc.line(margen, 32, 210 - margen, 32);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#0e1b2a');

    const fechaFinalizacion = pedido.fecha_finalizacion
      ? formatoFecha.format(new Date(pedido.fecha_finalizacion))
      : '—';

    const filaEtiquetaValor = (y: number, etiqueta: string, valor: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(etiqueta, margen, y);
      doc.setFont('helvetica', 'normal');
      doc.text(valor, margen + 38, y);
    };

    filaEtiquetaValor(41, 'Pedido:', pedido.id);
    filaEtiquetaValor(47, 'Fecha:', fechaFinalizacion);
    filaEtiquetaValor(53, 'Comprador:', pedido.comprador?.nombre ?? '—');
    filaEtiquetaValor(59, 'Teléfono:', pedido.comprador?.telefono ?? '—');

    const items = pedido.items_pedido ?? [];

    autoTable(doc, {
      startY: 68,
      margin: { left: margen, right: margen },
      head: [['Producto', 'Cantidad', 'Precio unitario', 'Subtotal']],
      body: items.map((item) => [
        item.nombre_producto,
        String(item.cantidad),
        formatoMoneda.format(item.precio_unitario),
        formatoMoneda.format(item.subtotal),
      ]),
      foot: [['', '', 'Total', formatoMoneda.format(pedido.total)]],
      headStyles: { fillColor: '#0f766e', textColor: '#ffffff' },
      footStyles: {
        fillColor: '#ccfbf1',
        textColor: '#115e59',
        fontStyle: 'bold',
        fontSize: 11,
      },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
      styles: { fontSize: 10, cellPadding: 3 },
    });

    doc.save(`Factura-${pedido.id}.pdf`);
  }
}
