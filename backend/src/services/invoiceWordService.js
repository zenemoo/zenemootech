import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  Header,
  Footer,
  convertInchesToTwip,
} from 'docx';
import { invoiceStorageService } from './invoiceStorageService.js';

function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount || 0);
  const curr = String(currency || 'INR').toUpperCase().trim();
  const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (curr === 'INR') return `₹ ${formatted}`;
  if (curr === 'USD') return `$ ${formatted}`;
  if (curr === 'EUR') return `€ ${formatted}`;
  if (curr === 'GBP') return `£ ${formatted}`;
  return `${curr} ${formatted}`;
}

const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const cellBorder = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const cardBorders = {
  top: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' },
  left: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' },
  right: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' },
};

/**
 * Generates an authoritative, editable Microsoft Word (.docx) Document of the invoice
 * Preserves the exact corporate hierarchy, styling, calculations, and signature snapshot of the invoice.
 *
 * @param {Object} invoice The complete invoice object with snapshots
 * @param {Object} options Optional settings: { signatureBuffer?: Buffer, signatureDataUrl?: string }
 * @returns {Promise<Buffer>} Node.js binary Buffer of the .docx file
 */
export async function generateInvoiceDocxBuffer(invoice, options = {}) {
  const company = invoice.company_snapshot || {};
  const client = invoice.client_snapshot || {};
  const bank = invoice.bank_snapshot || {};
  const currency = invoice.currency || 'INR';

  // 1. Resolve Signature Buffer if invoice snapshot has include_signature enabled
  const wantsSignature = Boolean(invoice.include_signature ?? company.include_signature);
  let signatureBuffer = options.signatureBuffer || null;

  if (wantsSignature && !signatureBuffer) {
    if (options.signatureDataUrl && options.signatureDataUrl.includes('base64,')) {
      const parts = options.signatureDataUrl.split('base64,');
      signatureBuffer = Buffer.from(parts[1], 'base64');
    } else {
      const sigKey = company.signature_key || invoice.signature_key;
      if (sigKey) {
        try {
          signatureBuffer = await invoiceStorageService.getSignatureImageBuffer(sigKey);
        } catch (err) {
          console.warn('[invoiceWordService] Could not retrieve signature buffer for docx:', err.message);
        }
      }
    }
  }

  // Brand Header Table: Left (Company Info), Right (Invoice Title & Numbers)
  const companyAddressParts = [
    company.registered_address,
    company.city,
    company.state ? `${company.state} ${company.postal_code || ''}` : company.postal_code,
    company.country,
  ].filter(Boolean);

  const legalBadges = [];
  if (company.pan_number) legalBadges.push(`PAN: ${company.pan_number}`);
  if (company.udyam_registration) legalBadges.push(`Udyam: ${company.udyam_registration}`);
  if (company.gstin) legalBadges.push(`GSTIN: ${company.gstin}`);

  const headerLeftParagraphs = [
    new Paragraph({
      children: [
        new TextRun({
          text: company.display_name || 'Zenemoo',
          bold: true,
          size: 32, // 16 pt
          color: '0F172A',
        }),
      ],
      spacing: { after: 60 },
    }),
  ];

  if (companyAddressParts.length > 0) {
    headerLeftParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: companyAddressParts.join(', '),
            size: 18, // 9 pt
            color: '64748B',
          }),
        ],
        spacing: { after: 40 },
      })
    );
  }

  if (company.official_email || company.contact_number) {
    const contactLine = [
      company.official_email ? `Email: ${company.official_email}` : '',
      company.contact_number ? `Phone: ${company.contact_number}` : '',
    ]
      .filter(Boolean)
      .join('   |   ');

    headerLeftParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactLine,
            size: 18,
            color: '64748B',
          }),
        ],
        spacing: { after: 40 },
      })
    );
  }

  if (legalBadges.length > 0) {
    headerLeftParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: legalBadges.join('   |   '),
            bold: true,
            size: 17,
            color: '475569',
          }),
        ],
        spacing: { after: 120 },
      })
    );
  }

  const headerRightParagraphs = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: 'INVOICE',
          bold: true,
          size: 40, // 20 pt
          color: '0F172A',
        }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: invoice.invoice_number || 'ZEN-INV-DRAFT',
          bold: true,
          size: 22, // 11 pt
          color: '1E3A8A',
        }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: 'Invoice Date: ', bold: true, size: 18, color: '64748B' }),
        new TextRun({ text: invoice.invoice_date || '—', size: 18, color: '1E293B' }),
      ],
      spacing: { after: 30 },
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: 'Due Date: ', bold: true, size: 18, color: '64748B' }),
        new TextRun({ text: invoice.due_date || '—', size: 18, color: '1E293B' }),
      ],
      spacing: { after: 30 },
    }),
  ];

  if (invoice.service_period_start || invoice.service_period_end) {
    const period = [invoice.service_period_start, invoice.service_period_end].filter(Boolean).join(' to ');
    headerRightParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: 'Service Period: ', bold: true, size: 18, color: '64748B' }),
          new TextRun({ text: period, size: 18, color: '1E293B' }),
        ],
        spacing: { after: 30 },
      })
    );
  }

  if (invoice.po_reference) {
    headerRightParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: 'PO Reference: ', bold: true, size: 18, color: '64748B' }),
          new TextRun({ text: invoice.po_reference, size: 18, color: '1E293B' }),
        ],
        spacing: { after: 30 },
      })
    );
  }

  const topHeaderTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: headerLeftParagraphs,
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: headerRightParagraphs,
          }),
        ],
      }),
    ],
  });

  // Client Details Card
  const clientAddress = [client.address, client.city, client.state, client.postal_code, client.country]
    .filter(Boolean)
    .join(', ');

  const clientTaxList = [];
  if (client.pan_number) clientTaxList.push(`PAN: ${client.pan_number}`);
  if (client.gstin) clientTaxList.push(`GSTIN: ${client.gstin}`);

  const billedToChildren = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'BILLED TO',
          bold: true,
          size: 16,
          color: '1E3A8A',
        }),
      ],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: client.company_name || 'Client Company',
          bold: true,
          size: 20,
          color: '0F172A',
        }),
      ],
      spacing: { after: 40 },
    }),
  ];

  if (client.contact_person) {
    billedToChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Attn: ', bold: true, size: 17, color: '64748B' }),
          new TextRun({ text: client.contact_person, size: 17, color: '1E293B' }),
        ],
        spacing: { after: 30 },
      })
    );
  }

  if (clientAddress) {
    billedToChildren.push(
      new Paragraph({
        children: [new TextRun({ text: clientAddress, size: 17, color: '1E293B' })],
        spacing: { after: 30 },
      })
    );
  }

  if (client.billing_email) {
    billedToChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Email: ', bold: true, size: 17, color: '64748B' }),
          new TextRun({ text: client.billing_email, size: 17, color: '1E293B' }),
        ],
        spacing: { after: 30 },
      })
    );
  }

  if (clientTaxList.length > 0) {
    billedToChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: clientTaxList.join('   |   '),
            size: 16,
            color: '64748B',
          }),
        ],
        spacing: { after: 40 },
      })
    );
  }

  const projectChildren = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'ENGAGEMENT & TERMS',
          bold: true,
          size: 16,
          color: '1E3A8A',
        }),
      ],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: invoice.project_name || 'Project Services',
          bold: true,
          size: 19,
          color: '0F172A',
        }),
      ],
      spacing: { after: 40 },
    }),
  ];

  if (invoice.project_description) {
    projectChildren.push(
      new Paragraph({
        children: [new TextRun({ text: invoice.project_description, size: 17, color: '64748B' })],
        spacing: { after: 40 },
      })
    );
  }

  projectChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Payment Terms: ', bold: true, size: 17, color: '64748B' }),
        new TextRun({ text: invoice.payment_terms || company.default_payment_terms || 'Net 15 Days', size: 17, color: '1E293B' }),
      ],
      spacing: { after: 30 },
    })
  );

  const billingCardTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            borders: cardBorders,
            margins: { top: 140, bottom: 140, left: 160, right: 160 },
            children: billedToChildren,
          }),
          new TableCell({
            width: { size: 5, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [new Paragraph({})],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            borders: cardBorders,
            margins: { top: 140, bottom: 140, left: 160, right: 160 },
            children: projectChildren,
          }),
        ],
      }),
    ],
  });

  // Itemized Services Table
  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          shading: { fill: '0F172A' },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: '#', bold: true, size: 17, color: 'FFFFFF' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 52, type: WidthType.PERCENTAGE },
          shading: { fill: '0F172A' },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Service Description', bold: true, size: 17, color: 'FFFFFF' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          shading: { fill: '0F172A' },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: 'Qty / Unit', bold: true, size: 17, color: 'FFFFFF' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          shading: { fill: '0F172A' },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: 'Rate', bold: true, size: 17, color: 'FFFFFF' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          shading: { fill: '0F172A' },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: 'Amount', bold: true, size: 17, color: 'FFFFFF' })],
            }),
          ],
        }),
      ],
    }),
  ];

  const items = invoice.line_items || [];
  items.forEach((item, idx) => {
    const qty = Number(item.quantity) || 1;
    const rate = Number(item.rate) || 0;
    const amount = Number(item.amount !== undefined ? item.amount : qty * rate);
    const qtyStr = qty.toLocaleString('en-US', { maximumFractionDigits: 2 }) + (item.unit ? ` ${item.unit}` : '');
    const isEven = idx % 2 === 0;

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 6, type: WidthType.PERCENTAGE },
            shading: isEven ? { fill: 'FFFFFF' } : { fill: 'FAFAFA' },
            borders: cellBorder,
            margins: { top: 90, bottom: 90, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: String(idx + 1), size: 17, color: '64748B' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 52, type: WidthType.PERCENTAGE },
            shading: isEven ? { fill: 'FFFFFF' } : { fill: 'FAFAFA' },
            borders: cellBorder,
            margins: { top: 90, bottom: 90, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: item.description || '', bold: true, size: 17, color: '1E293B' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 14, type: WidthType.PERCENTAGE },
            shading: isEven ? { fill: 'FFFFFF' } : { fill: 'FAFAFA' },
            borders: cellBorder,
            margins: { top: 90, bottom: 90, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: qtyStr, size: 17, color: '334155' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 14, type: WidthType.PERCENTAGE },
            shading: isEven ? { fill: 'FFFFFF' } : { fill: 'FAFAFA' },
            borders: cellBorder,
            margins: { top: 90, bottom: 90, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: formatCurrency(rate, currency), size: 17, color: '334155' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 14, type: WidthType.PERCENTAGE },
            shading: isEven ? { fill: 'FFFFFF' } : { fill: 'FAFAFA' },
            borders: cellBorder,
            margins: { top: 90, bottom: 90, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: formatCurrency(amount, currency), bold: true, size: 17, color: '0F172A' })],
              }),
            ],
          }),
        ],
      })
    );
  });

  const itemsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorder,
    rows: tableRows,
  });

  // Financial Breakdown & Bank Card Table
  const subtotal = Number(invoice.subtotal) || 0;
  const discountAmount = Number(invoice.discount_amount) || 0;
  const taxAmount = Number(invoice.tax_amount) || 0;
  const totalAmount = Number(invoice.total_amount) || 0;

  // Left Box: Amount in Words & Bank Remittance
  const bankCardChildren = [
    new Paragraph({
      children: [
        new TextRun({ text: 'Amount in Words:', bold: true, size: 17, color: '1E3A8A' }),
      ],
      spacing: { after: 30 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: invoice.amount_in_words || '—',
          italics: true,
          bold: true,
          size: 17,
          color: '1E293B',
        }),
      ],
      spacing: { after: 120 },
    }),
  ];

  if (bank.bank_name || bank.account_number) {
    bankCardChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'REMITTANCE BANK ACCOUNT', bold: true, size: 16, color: '1E3A8A' }),
        ],
        spacing: { after: 40 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Bank Name: ', bold: true, size: 16, color: '64748B' }),
          new TextRun({ text: bank.bank_name || '—', size: 16, color: '1E293B' }),
        ],
        spacing: { after: 20 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Account No: ', bold: true, size: 16, color: '64748B' }),
          new TextRun({ text: `${bank.account_number || '—'} (${bank.account_type || 'Current'})`, size: 16, color: '1E293B' }),
        ],
        spacing: { after: 20 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'IFSC Code: ', bold: true, size: 16, color: '64748B' }),
          new TextRun({ text: bank.ifsc_code || '—', bold: true, size: 16, color: '1E3A8A' }),
        ],
        spacing: { after: 20 },
      })
    );

    if (bank.branch_name) {
      bankCardChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Branch: ', bold: true, size: 16, color: '64748B' }),
            new TextRun({ text: bank.branch_name, size: 16, color: '1E293B' }),
          ],
          spacing: { after: 20 },
        })
      );
    }

    if (bank.swift_bic_code) {
      bankCardChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'SWIFT Code: ', bold: true, size: 16, color: '64748B' }),
            new TextRun({ text: bank.swift_bic_code, size: 16, color: '1E293B' }),
          ],
          spacing: { after: 20 },
        })
      );
    }
  }

  // Right Box: Totals Table
  const totalsRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 55, type: WidthType.PERCENTAGE },
          borders: noBorders,
          children: [new Paragraph({ children: [new TextRun({ text: 'Subtotal:', size: 17, color: '64748B' })] })],
        }),
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          borders: noBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: formatCurrency(subtotal, currency), size: 17, color: '1E293B' })],
            }),
          ],
        }),
      ],
    }),
  ];

  if (discountAmount > 0) {
    totalsRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [new Paragraph({ children: [new TextRun({ text: 'Discount:', size: 17, color: '10B981' })] })],
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `-${formatCurrency(discountAmount, currency)}`, bold: true, size: 17, color: '10B981' })],
              }),
            ],
          }),
        ],
      })
    );
  }

  if (invoice.tax_enabled && taxAmount > 0) {
    totalsRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${invoice.tax_label || 'GST'} (${invoice.tax_rate || 18}%):`,
                    size: 17,
                    color: '64748B',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `+${formatCurrency(taxAmount, currency)}`, size: 17, color: '1E293B' })],
              }),
            ],
          }),
        ],
      })
    );
  }

  // Total Due Highlight Row
  totalsRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 55, type: WidthType.PERCENTAGE },
          shading: { fill: '0F172A' },
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          borders: noBorders,
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'TOTAL AMOUNT DUE:', bold: true, size: 18, color: 'FFFFFF' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          shading: { fill: '0F172A' },
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          borders: noBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: formatCurrency(totalAmount, currency), bold: true, size: 20, color: 'FFFFFF' })],
            }),
          ],
        }),
      ],
    })
  );

  const totalsRightTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: totalsRows,
  });

  const bottomSplitTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            borders: cardBorders,
            margins: { top: 140, bottom: 140, left: 160, right: 160 },
            children: bankCardChildren,
          }),
          new TableCell({
            width: { size: 5, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [new Paragraph({})],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [totalsRightTable],
          }),
        ],
      }),
    ],
  });

  // Notes & Signatory Section
  const notesText = invoice.invoice_notes || company.default_invoice_notes;
  const signatoryName = company.authorized_signatory_name || 'Prem Prasad';

  const notesChildren = [];
  if (notesText) {
    notesChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'NOTES & TERMS', bold: true, size: 16, color: '1E3A8A' }),
        ],
        spacing: { after: 40 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: notesText, size: 16, color: '64748B' }),
        ],
        spacing: { after: 120 },
      })
    );
  }

  const signatoryChildren = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: 'For Zenemoo', size: 17, color: '64748B' }),
      ],
      spacing: { after: 60 },
    }),
  ];

  if (wantsSignature && signatureBuffer) {
    signatoryChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new ImageRun({
            data: signatureBuffer,
            transformation: {
              width: 140,
              height: 42,
            },
          }),
        ],
        spacing: { after: 60 },
      })
    );
  } else {
    // Spacer for manual signature if not attached digitally
    signatoryChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: '', size: 30 })],
        spacing: { after: 60 },
      })
    );
  }

  signatoryChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: '____________________________________',
          size: 16,
          color: 'CBD5E1',
        }),
      ],
      spacing: { after: 40 },
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: signatoryName,
          bold: true,
          size: 18,
          color: '0F172A',
        }),
      ],
      spacing: { after: 20 },
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: 'Authorized Signatory',
          size: 16,
          color: '64748B',
        }),
      ],
    })
  );

  const notesSignatoryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: notesChildren.length > 0 ? notesChildren : [new Paragraph({})],
          }),
          new TableCell({
            width: { size: 5, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [new Paragraph({})],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: signatoryChildren,
          }),
        ],
      }),
    ],
  });

  // Construct Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.6),
              bottom: convertInchesToTwip(0.6),
              left: convertInchesToTwip(0.6),
              right: convertInchesToTwip(0.6),
            },
          },
        },
        children: [
          topHeaderTable,
          new Paragraph({ spacing: { after: 120 } }),
          billingCardTable,
          new Paragraph({ spacing: { after: 140 } }),
          itemsTable,
          new Paragraph({ spacing: { after: 140 } }),
          bottomSplitTable,
          new Paragraph({ spacing: { after: 160 } }),
          notesSignatoryTable,
        ],
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'This is an authentic computer-generated invoice issued by Zenemoo.',
                    size: 15,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
