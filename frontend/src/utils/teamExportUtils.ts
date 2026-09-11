import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TeamMember } from '../services/talentTeamApi';

export interface VendorTeamExportHeader {
  vendorName: string;
  vendorRegistrationCode: string;
  vendorRole?: string;
  totalMembers: number;
  activeMembers: number;
  generatedAt?: string;
}

/**
 * Helper to trigger browser file download from Blob.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate RFC-4180 CSV with UTF-8 BOM
 */
export function exportTeamToCSV(
  header: VendorTeamExportHeader,
  members: TeamMember[]
): void {
  const BOM = '\uFEFF';
  const escape = (val: any): string => {
    if (val === null || val === undefined || val === '') return '-';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const genDate = header.generatedAt || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const lines: string[] = [
    'ZENEMOO TALENT HUB — VENDOR TEAM REPORT',
    `Vendor,${escape(header.vendorName)}`,
    `Registration Code,${escape(header.vendorRegistrationCode)}`,
    `Role,${escape(header.vendorRole || 'Vendor / Agency')}`,
    `Generated,${escape(genDate)}`,
    '',
    'SUMMARY',
    `Total Members,${header.totalMembers}`,
    `Active Members,${header.activeMembers}`,
    '',
    'TEAM MEMBERS',
    [
      'Member ID',
      'Full Name',
      'Email Address',
      'Contact Number',
      'State',
      'City / District',
      'Languages',
      'Availability',
      'Added Date',
      'Status',
    ].map(escape).join(','),
  ];

  members.forEach((m) => {
    const formattedDate = m.created_at
      ? new Date(m.created_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '-';

    const langStr = Array.isArray(m.languages) ? m.languages.join(', ') : (m.languages || '-');
    const phoneStr = m.phone ? `${m.country_code || '+91'} ${m.phone}` : '-';

    lines.push(
      [
        m.member_code || m.id?.substring(0, 8) || '-',
        m.full_name || '-',
        m.email || '-',
        phoneStr,
        m.state || '-',
        m.city_district || '-',
        langStr,
        m.availability || '-',
        formattedDate,
        (m.status || 'active').toUpperCase(),
      ].map(escape).join(',')
    );
  });

  const csvContent = BOM + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `Zenemoo_Team_${header.vendorRegistrationCode}_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadBlob(blob, filename);
}

/**
 * Generate XML-based Spreadsheet (.xlsx compatible format)
 */
export function exportTeamToXLSX(
  header: VendorTeamExportHeader,
  members: TeamMember[]
): void {
  const genDate = header.generatedAt || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="16" ss:Bold="1" ss:Color="#0284C7"/>
  </Style>
  <Style ss:ID="SubHeader">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1" ss:Color="#334155"/>
  </Style>
  <Style ss:ID="TableHeader">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="DataCell">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Team Members">
  <Table>
   <Row><Cell ss:StyleID="Title"><Data ss:Type="String">ZENEMOO — Vendor Team Report</Data></Cell></Row>
   <Row><Cell ss:StyleID="SubHeader"><Data ss:Type="String">Vendor: ${header.vendorName}</Data></Cell></Row>
   <Row><Cell ss:StyleID="SubHeader"><Data ss:Type="String">Registration Code: ${header.vendorRegistrationCode}</Data></Cell></Row>
   <Row><Cell ss:StyleID="SubHeader"><Data ss:Type="String">Generated: ${genDate}</Data></Cell></Row>
   <Row><Cell ss:StyleID="SubHeader"><Data ss:Type="String">Total Members: ${header.totalMembers} | Active: ${header.activeMembers}</Data></Cell></Row>
   <Row></Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Member ID</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Full Name</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Email Address</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Contact Number</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">State</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">City / District</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Languages</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Availability</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Added Date</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Status</Data></Cell>
   </Row>`;

  members.forEach((m) => {
    const formattedDate = m.created_at
      ? new Date(m.created_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '-';

    const langStr = Array.isArray(m.languages) ? m.languages.join(', ') : (m.languages || '-');
    const phoneStr = m.phone ? `${m.country_code || '+91'} ${m.phone}` : '-';

    const clean = (val: any) => String(val || '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    xml += `
   <Row>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${clean(m.member_code || m.id?.substring(0, 8))}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${clean(m.full_name)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${clean(m.email)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${clean(phoneStr)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${clean(m.state)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${clean(m.city_district)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${clean(langStr)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${clean(m.availability)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${clean(formattedDate)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${clean((m.status || 'active').toUpperCase())}</Data></Cell>
   </Row>`;
  });

  xml += `
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;' });
  const filename = `Zenemoo_Team_${header.vendorRegistrationCode}_${new Date().toISOString().slice(0, 10)}.xls`;
  downloadBlob(blob, filename);
}

/**
 * Generate Official PDF with Zenemoo Branding and Header Layout
 */
export function exportTeamToPDF(
  header: VendorTeamExportHeader,
  members: TeamMember[]
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const genDate = header.generatedAt || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Top branding banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 842, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ZENEMOO', 30, 36);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text('TALENT HUB  |  VENDOR TEAM REPORT', 140, 36);

  // Vendor Meta box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(30, 75, 782, 50, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(30, 75, 782, 50, 4, 4, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Vendor / Agency:', 45, 95);
  doc.setFont('helvetica', 'normal');
  doc.text(header.vendorName || '-', 150, 95);

  doc.setFont('helvetica', 'bold');
  doc.text('Registration Code:', 380, 95);
  doc.setFont('helvetica', 'normal');
  doc.text(header.vendorRegistrationCode || '-', 490, 95);

  doc.setFont('helvetica', 'bold');
  doc.text('Generated:', 650, 95);
  doc.setFont('helvetica', 'normal');
  doc.text(genDate, 720, 95);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Team Members:', 45, 114);
  doc.setFont('helvetica', 'normal');
  doc.text(`${header.totalMembers}  (Active: ${header.activeMembers})`, 170, 114);

  // Table Data Preparation
  const tableRows = members.map((m, idx) => {
    const formattedDate = m.created_at
      ? new Date(m.created_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '-';

    const langStr = Array.isArray(m.languages) ? m.languages.join(', ') : (m.languages || '-');
    const phoneStr = m.phone ? `${m.country_code || '+91'} ${m.phone}` : '-';

    return [
      m.member_code || `#${idx + 1}`,
      m.full_name || '-',
      m.email || '-',
      phoneStr,
      `${m.city_district || '-'}${m.state ? `, ${m.state}` : ''}`,
      langStr,
      m.availability || 'Immediately',
      formattedDate,
      (m.status || 'active').toUpperCase(),
    ];
  });

  autoTable(doc, {
    startY: 140,
    head: [[
      'Member ID',
      'Name',
      'Email',
      'Contact',
      'Location',
      'Languages',
      'Availability',
      'Added Date',
      'Status',
    ]],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 70, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 95, fontStyle: 'bold' },
      2: { cellWidth: 120 },
      3: { cellWidth: 85 },
      4: { cellWidth: 100 },
      5: { cellWidth: 100 },
      6: { cellWidth: 75, halign: 'center' },
      7: { cellWidth: 65, halign: 'center' },
      8: { cellWidth: 55, halign: 'center' },
    },
    margin: { left: 30, right: 30 },
    didDrawPage: (data) => {
      // Footer page numbering
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber} of ${doc.getNumberOfPages()}  •  Zenemoo Data Solutions  •  Confidential`,
        421,
        580,
        { align: 'center' }
      );
    },
  });

  const filename = `Zenemoo_Team_${header.vendorRegistrationCode}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
