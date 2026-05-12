import jsPDF from 'jspdf'

function drawLineField(pdf: jsPDF, label: string, x: number, y: number, width: number) {
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(label, x, y)
  pdf.line(x, y + 12, x + width, y + 12)
}

function drawCheckbox(pdf: jsPDF, label: string, x: number, y: number) {
  pdf.rect(x, y - 8, 10, 10)
  pdf.text(label, x + 16, y)
}

export function exportStudentFormPdf(year?: number) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const marginX = 40
  let y = 44

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text('Formulario de inscripcion del alumno', marginX, y)

  y += 20
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text('Complete este formato con la misma informacion solicitada en el registro digital.', marginX, y)

  y += 28
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text('1. Datos personales', marginX, y)

  y += 20
  drawLineField(pdf, 'Nombres', marginX, y, 240)
  drawLineField(pdf, 'Apellidos', marginX + 270, y, pageWidth - marginX * 2 - 270)

  y += 30
  drawLineField(pdf, 'Fecha de nacimiento', marginX, y, 170)
  drawLineField(pdf, 'Grupo', marginX + 220, y, pageWidth - marginX * 2 - 220)

  y += 30
  pdf.text('Observaciones', marginX, y)
  pdf.line(marginX, y + 12, pageWidth - marginX, y + 12)
  pdf.line(marginX, y + 32, pageWidth - marginX, y + 32)

  y += 64
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text('2. Sacramentos recibidos', marginX, y)

  y += 20
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  drawCheckbox(pdf, 'Bautismo', marginX, y)
  drawCheckbox(pdf, 'Primera comunion', marginX + 150, y)
  drawCheckbox(pdf, 'Confirmacion', marginX + 340, y)

  y += 34
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text('3. Acudiente 1', marginX, y)

  y += 20
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  drawLineField(pdf, 'Nombre', marginX, y, 240)
  drawLineField(pdf, 'Parentesco', marginX + 270, y, pageWidth - marginX * 2 - 270)

  y += 30
  drawLineField(pdf, 'Telefono', marginX, y, 170)
  drawLineField(pdf, 'WhatsApp', marginX + 220, y, 170)
  drawLineField(pdf, 'Correo', marginX + 420, y, pageWidth - marginX * 2 - 420)

  y += 30
  drawCheckbox(pdf, 'Acudiente principal', marginX, y)

  y += 34
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text('4. Acudiente 2', marginX, y)

  y += 20
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  drawLineField(pdf, 'Nombre', marginX, y, 240)
  drawLineField(pdf, 'Parentesco', marginX + 270, y, pageWidth - marginX * 2 - 270)

  y += 30
  drawLineField(pdf, 'Telefono', marginX, y, 170)
  drawLineField(pdf, 'WhatsApp', marginX + 220, y, 170)
  drawLineField(pdf, 'Correo', marginX + 420, y, pageWidth - marginX * 2 - 420)

  y += 30
  drawCheckbox(pdf, 'Acudiente principal', marginX, y)

  y += 40
  pdf.setFontSize(10)
  pdf.text('Firma del acudiente', marginX, y)
  pdf.line(marginX, y + 26, 250, y + 26)
  pdf.text('Fecha', 340, y)
  pdf.line(340, y + 26, 470, y + 26)

  y += 62
  pdf.setTextColor(90, 90, 90)
  pdf.text('Uso interno: este formulario corresponde a los campos del modulo de alumnos.', marginX, y)

  pdf.save(`formulario-alumno${year ? `-${year}` : ''}.pdf`)
}
