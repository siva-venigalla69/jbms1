// Professional Print & PDF Service
// Reusable service for generating PDFs and printing across all modules

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types for print configuration
export interface PrintConfig {
  title: string;
  subtitle?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  data: any[];
  columns: PrintColumn[];
  summary?: PrintSummary[];
  footer?: string;
  orientation?: 'portrait' | 'landscape';
}

export interface PrintColumn {
  header: string;
  dataKey: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'date' | 'number' | 'text';
}

export interface PrintSummary {
  label: string;
  value: string | number;
  format?: 'currency' | 'number';
}

export class PrintService {
  private static readonly COMPANY_INFO = {
    name: 'Digital Textile Printing Co.',
    address: 'Your Company Address',
    phone: '+91 XXXXX XXXXX',
    email: 'info@company.com',
    gstin: 'GSTIN: XXXXXXXXXXXXXXX'
  };

  // Generate professional PDF with company branding
  static generatePDF(config: PrintConfig): void {
    try {
      const doc = new jsPDF({
        orientation: config.orientation || 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      let yPosition = margin;

      // Company Header
      yPosition = this.addCompanyHeader(doc, yPosition, pageWidth, margin);
      
      // Document Title
      yPosition = this.addDocumentTitle(doc, config.title, yPosition, pageWidth, config.subtitle);
      
      // Date Range (if provided)
      if (config.dateRange) {
        yPosition = this.addDateRange(doc, config.dateRange, yPosition, margin);
      }
      
      // Main Data Table
      yPosition = this.addDataTable(doc, config.data, config.columns, yPosition);
      
      // Summary Section (if provided)
      if (config.summary && config.summary.length > 0) {
        this.addSummarySection(doc, config.summary, yPosition, pageWidth, margin);
      }
      
      // Footer
      this.addFooter(doc, config.footer);
      
      // Generate filename and save
      const filename = this.generateFilename(config.title, config.dateRange);
      doc.save(filename);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF: ' + (error as Error).message);
    }
  }

  // Direct print functionality
  static printDocument(config: PrintConfig): void {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Unable to open print window. Please check popup blocker.');
      }

      const htmlContent = this.generatePrintHTML(config);
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
      
    } catch (error) {
      console.error('Error printing document:', error);
      throw new Error('Failed to print document: ' + (error as Error).message);
    }
  }

  // Generate HTML for printing
  private static generatePrintHTML(config: PrintConfig): string {
    const dateRangeText = config.dateRange 
      ? `<p><strong>Period:</strong> ${this.formatDate(config.dateRange.from)} to ${this.formatDate(config.dateRange.to)}</p>`
      : '';

    const summaryHTML = config.summary && config.summary.length > 0
      ? this.generateSummaryHTML(config.summary)
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${config.title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
          }
          .company-details {
            font-size: 12px;
            color: #666;
          }
          .document-title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin: 30px 0 20px 0;
          }
          .date-range {
            text-align: center;
            margin-bottom: 30px;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .summary {
            margin-top: 30px;
            border-top: 2px solid #333;
            padding-top: 20px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 14px;
          }
          .summary-total {
            font-weight: bold;
            font-size: 16px;
            border-top: 1px solid #333;
            padding-top: 10px;
            margin-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
            @page {
              margin: 1cm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${this.COMPANY_INFO.name}</div>
          <div class="company-details">
            ${this.COMPANY_INFO.address}<br>
            Phone: ${this.COMPANY_INFO.phone} | Email: ${this.COMPANY_INFO.email}<br>
            ${this.COMPANY_INFO.gstin}
          </div>
        </div>
        
        <div class="document-title">${config.title}</div>
        ${config.subtitle ? `<div class="text-center" style="margin-bottom: 20px;"><em>${config.subtitle}</em></div>` : ''}
        
        <div class="date-range">
          ${dateRangeText}
          <p><strong>Generated on:</strong> ${this.formatDate(new Date().toISOString())}</p>
        </div>
        
        ${this.generateTableHTML(config.data, config.columns)}
        
        ${summaryHTML}
        
        <div class="footer">
          ${config.footer || 'This is a system generated document.'}
        </div>
      </body>
      </html>
    `;
  }

  // Add company header to PDF
  private static addCompanyHeader(doc: jsPDF, yPosition: number, pageWidth: number, margin: number): number {
    const centerX = pageWidth / 2;
    
    // Company name
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(this.COMPANY_INFO.name, centerX, yPosition, { align: 'center' });
    yPosition += 8;
    
    // Company details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(this.COMPANY_INFO.address, centerX, yPosition, { align: 'center' });
    yPosition += 5;
    
    doc.text(`Phone: ${this.COMPANY_INFO.phone} | Email: ${this.COMPANY_INFO.email}`, centerX, yPosition, { align: 'center' });
    yPosition += 5;
    
    doc.text(this.COMPANY_INFO.gstin, centerX, yPosition, { align: 'center' });
    yPosition += 10;
    
    // Separator line
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    
    return yPosition;
  }

  // Add document title to PDF
  private static addDocumentTitle(doc: jsPDF, title: string, yPosition: number, pageWidth: number, subtitle?: string): number {
    const centerX = pageWidth / 2;
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, centerX, yPosition, { align: 'center' });
    yPosition += 8;
    
    if (subtitle) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'italic');
      doc.text(subtitle, centerX, yPosition, { align: 'center' });
      yPosition += 6;
    }
    
    yPosition += 5;
    return yPosition;
  }

  // Add date range to PDF
  private static addDateRange(doc: jsPDF, dateRange: {from: string, to: string}, yPosition: number, margin: number): number {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${this.formatDate(dateRange.from)} to ${this.formatDate(dateRange.to)}`, margin, yPosition);
    yPosition += 5;
    
    doc.text(`Generated on: ${this.formatDate(new Date().toISOString())}`, margin, yPosition);
    yPosition += 10;
    
    return yPosition;
  }

  // Add data table to PDF
  private static addDataTable(doc: jsPDF, data: any[], columns: PrintColumn[], yPosition: number): number {
    const tableColumns = columns.map(col => col.header);
    const tableData = data.map(row => 
      columns.map(col => this.formatCellValue(row[col.dataKey], col.format))
    );
    
    autoTable(doc, {
      startY: yPosition,
      head: [tableColumns],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: this.getColumnStyles(columns),
      margin: { left: 15, right: 15 },
      didDrawPage: (data) => {
        // Add page numbers
        const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.text(`Page ${pageNumber}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
      }
    });
    
    return (doc as any).lastAutoTable.finalY + 10;
  }

  // Add summary section to PDF
  private static addSummarySection(doc: jsPDF, summary: PrintSummary[], yPosition: number, pageWidth: number, margin: number): number {
    const rightX = pageWidth - margin;
    const summaryWidth = 80;
    const summaryX = rightX - summaryWidth;
    
    // Summary box
    doc.setLineWidth(0.3);
    doc.rect(summaryX, yPosition, summaryWidth, summary.length * 6 + 10);
    
    yPosition += 8;
    
    doc.setFontSize(10);
    summary.forEach((item, index) => {
      const isTotal = index === summary.length - 1;
      doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
      
      doc.text(item.label + ':', summaryX + 3, yPosition);
      const valueText = this.formatCellValue(item.value, item.format);
      doc.text(valueText, rightX - 3, yPosition, { align: 'right' });
      
      if (isTotal) {
        // Line above total
        doc.line(summaryX + 3, yPosition - 2, rightX - 3, yPosition - 2);
      }
      
      yPosition += 6;
    });
    
    return yPosition + 10;
  }

  // Add footer to PDF
  private static addFooter(doc: jsPDF, footerText?: string): void {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    const footer = footerText || 'This is a system generated document.';
    doc.text(footer, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  // Generate HTML table for printing
  private static generateTableHTML(data: any[], columns: PrintColumn[]): string {
    const headerHTML = columns.map(col => `<th class="${this.getAlignClass(col.align)}">${col.header}</th>`).join('');
    
    const rowsHTML = data.map(row => {
      const cellsHTML = columns.map(col => {
        const value = this.formatCellValue(row[col.dataKey], col.format);
        return `<td class="${this.getAlignClass(col.align)}">${value}</td>`;
      }).join('');
      return `<tr>${cellsHTML}</tr>`;
    }).join('');
    
    return `
      <table>
        <thead>
          <tr>${headerHTML}</tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
    `;
  }

  // Generate summary HTML for printing
  private static generateSummaryHTML(summary: PrintSummary[]): string {
    const summaryRows = summary.map((item, index) => {
      const isTotal = index === summary.length - 1;
      const className = isTotal ? 'summary-total' : '';
      const value = this.formatCellValue(item.value, item.format);
      return `<div class="summary-row ${className}"><span>${item.label}:</span><span>${value}</span></div>`;
    }).join('');
    
    return `<div class="summary">${summaryRows}</div>`;
  }

  // Helper methods
  private static getColumnStyles(columns: PrintColumn[]): {[key: number]: any} {
    const styles: {[key: number]: any} = {};
    columns.forEach((col, index) => {
      styles[index] = {
        halign: col.align || 'left',
        cellWidth: col.width || 'auto'
      };
      if (col.format === 'currency' || col.format === 'number') {
        styles[index].halign = 'right';
      }
    });
    return styles;
  }

  private static getAlignClass(align?: string): string {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return '';
    }
  }

  private static formatCellValue(value: any, format?: string): string {
    if (value == null) return '';
    
    switch (format) {
      case 'currency':
        return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      case 'number':
        return Number(value).toLocaleString('en-IN');
      case 'date':
        return this.formatDate(value);
      default:
        return String(value);
    }
  }

  private static formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  private static generateFilename(title: string, dateRange?: {from: string, to: string}): string {
    const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = dateRange 
      ? `_${dateRange.from}_to_${dateRange.to}`
      : `_${new Date().toISOString().split('T')[0]}`;
    return `${cleanTitle}${dateStr}.pdf`;
  }

  // Specific document generators
  static generateInvoicePDF(invoice: any, items: any[]): void {
    const config: PrintConfig = {
      title: `GST INVOICE`,
      subtitle: `Invoice No: ${invoice.invoice_number} | Date: ${this.formatDate(invoice.invoice_date)}`,
      data: items,
      columns: [
        { header: 'S.No', dataKey: 'index', width: 15, align: 'center' },
        { header: 'Description', dataKey: 'description', width: 80 },
        { header: 'Qty', dataKey: 'quantity', width: 20, align: 'right', format: 'number' },
        { header: 'Rate', dataKey: 'unit_price', width: 25, align: 'right', format: 'currency' },
        { header: 'Amount', dataKey: 'line_total', width: 30, align: 'right', format: 'currency' }
      ],
      summary: [
        { label: 'Subtotal', value: invoice.subtotal, format: 'currency' },
        { label: 'GST (18%)', value: invoice.tax_amount, format: 'currency' },
        { label: 'Total Amount', value: invoice.total_amount, format: 'currency' }
      ],
      footer: `Customer: ${invoice.customer_name} | Due Date: ${this.formatDate(invoice.due_date)}`
    };
    
    this.generatePDF(config);
  }

  static generateChallanPDF(challan: any, items: any[]): void {
    const config: PrintConfig = {
      title: `DELIVERY CHALLAN`,
      subtitle: `Challan No: ${challan.challan_number} | Date: ${this.formatDate(challan.delivery_date)}`,
      data: items,
      columns: [
        { header: 'S.No', dataKey: 'index', width: 15, align: 'center' },
        { header: 'Item Description', dataKey: 'description', width: 100 },
        { header: 'Quantity', dataKey: 'quantity_delivered', width: 25, align: 'right', format: 'number' },
        { header: 'Rate', dataKey: 'unit_price', width: 25, align: 'right', format: 'currency' },
        { header: 'Value', dataKey: 'line_total', width: 30, align: 'right', format: 'currency' }
      ],
      footer: `Customer: ${challan.customer_name} | Delivery Status: ${challan.status}`
    };
    
    this.generatePDF(config);
  }

  static generatePaymentReceiptPDF(payment: any): void {
    const config: PrintConfig = {
      title: `PAYMENT RECEIPT`,
      subtitle: `Receipt No: ${payment.payment_number} | Date: ${this.formatDate(payment.payment_date)}`,
      data: [{
        description: payment.description || 'Payment received',
        amount: payment.amount,
        method: payment.payment_method,
        reference: payment.transaction_reference || 'N/A'
      }],
      columns: [
        { header: 'Description', dataKey: 'description', width: 80 },
        { header: 'Amount', dataKey: 'amount', width: 30, align: 'right', format: 'currency' },
        { header: 'Method', dataKey: 'method', width: 30, align: 'center' },
        { header: 'Reference', dataKey: 'reference', width: 40, align: 'center' }
      ],
      summary: [
        { label: 'Amount Received', value: payment.amount, format: 'currency' }
      ],
      footer: `Customer: ${payment.customer_name} | Thank you for your payment!`
    };
    
    this.generatePDF(config);
  }
}

export default PrintService;