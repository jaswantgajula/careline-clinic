import PDFDocument from 'pdfkit';

const clinicDateTime = (value, options = {}) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'long',
    ...options,
  }).format(new Date(value));

function section(doc, title) {
  doc.moveDown(0.8).font('Helvetica-Bold').fontSize(11).fillColor('#315fcb').text(title);
  doc
    .moveDown(0.35)
    .strokeColor('#dfe6f2')
    .lineWidth(1)
    .moveTo(54, doc.y)
    .lineTo(541, doc.y)
    .stroke();
  doc.moveDown(0.55).font('Helvetica').fontSize(10).fillColor('#25334b');
}

export function renderVisitSummaryPdf({ appointment, summary }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 54,
      info: { Title: 'Careline visit summary' },
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, 595, 106).fill('#142642');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(24).text('careline.', 54, 38);
    doc.font('Helvetica').fontSize(9).fillColor('#bfcde5').text('CLINIC & WELLNESS', 55, 70, {
      characterSpacing: 1.7,
    });
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(14).text('Visit summary', 380, 47, {
      width: 161,
      align: 'right',
    });

    doc.y = 132;
    doc.fillColor('#25334b').font('Helvetica-Bold').fontSize(16).text(appointment.patient.name);
    doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor('#66758c');
    doc.text(
      `Appointment: ${clinicDateTime(appointment.start)} at ${new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', timeStyle: 'short' }).format(new Date(appointment.start))}`,
    );
    doc.text(`${appointment.doctor.name} · ${appointment.doctor.specialty || 'Consultation'}`);
    doc.text(`Reference: ${appointment._id}`);

    section(doc, 'Clinical impression');
    doc.text(summary.diagnosis || 'No diagnosis recorded.', { lineGap: 3 });

    section(doc, 'Medicines');
    if (summary.medications.length) {
      summary.medications.forEach((medicine, index) => {
        doc.font('Helvetica-Bold').text(`${index + 1}. ${medicine.name}`);
        const details = [medicine.dosage, medicine.frequency, medicine.duration]
          .filter(Boolean)
          .join(' · ');
        if (details) doc.font('Helvetica').fillColor('#4f6078').text(details);
        if (medicine.instructions)
          doc.font('Helvetica-Oblique').fillColor('#66758c').text(medicine.instructions);
        doc.moveDown(0.45).fillColor('#25334b');
      });
    } else {
      doc.text('No medicines were added to this summary.');
    }

    section(doc, 'Care advice');
    doc.text(summary.advice || 'No additional care instructions were recorded.', { lineGap: 3 });

    section(doc, 'Follow-up');
    doc.text(
      summary.followUpDate
        ? `Recommended on ${clinicDateTime(summary.followUpDate)}.`
        : 'Follow up as advised by your doctor.',
    );

    const footerY = 770;
    doc.strokeColor('#dfe6f2').moveTo(54, footerY).lineTo(541, footerY).stroke();
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#7b899d')
      .text(
        `Published ${clinicDateTime(summary.publishedAt)} · This summary supports continuity of care and is not a substitute for emergency medical help.`,
        54,
        footerY + 12,
        { width: 487, align: 'center' },
      );
    doc.end();
  });
}
