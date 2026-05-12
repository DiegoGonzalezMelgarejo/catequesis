import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import type { GroupDetail } from '@/services/group-service'
import { formatDate } from '@/utils/date'

function createGroupReportHtml(detail: GroupDetail) {
  const studentsRows = detail.students
    .map(
      (student) => `
        <tr>
          <td>${student.fullName}</td>
          <td>${student.age}</td>
          <td>${student.primaryGuardianName ?? 'Sin acudiente'}</td>
          <td>${student.attendanceRate.toFixed(0)}%</td>
          <td>${student.absenceCount}</td>
        </tr>
      `,
    )
    .join('')

  const attendanceRows = detail.attendanceSessions
    .slice(0, 20)
    .map(
      (session) => `
        <tr>
          <td>${formatDate(session.date)}</td>
          <td>${session.counts.presentes}</td>
          <td>${session.counts.ausentes}</td>
          <td>${session.counts.justificados}</td>
        </tr>
      `,
    )
    .join('')

  return `
    <html>
      <head>
        <title>Reporte ${detail.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1f2940; }
          h1, h2 { margin: 0 0 12px; }
          p { margin: 4px 0; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
          .card { border: 1px solid #dbe1ff; border-radius: 16px; padding: 16px; background: #f8f9ff; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #dbe1ff; padding: 10px; text-align: left; font-size: 13px; }
          th { background: #eef2ff; }
        </style>
      </head>
      <body>
        <h1>${detail.name}</h1>
        <p>Horario: ${detail.schedule || 'Sin horario definido'}</p>
        <p>Catequistas: ${detail.catechists.join(', ') || 'Sin asignar'}</p>
        <p>Descripción: ${detail.description || 'Sin descripción registrada'}</p>

        <div class="grid">
          <div class="card"><strong>Alumnos activos</strong><p>${detail.studentCount}</p></div>
          <div class="card"><strong>Actividades pendientes</strong><p>${detail.pendingActivities}</p></div>
          <div class="card"><strong>Jornadas</strong><p>${detail.attendanceSessions.length}</p></div>
          <div class="card"><strong>Actividades</strong><p>${detail.activityCount}</p></div>
        </div>

        <h2>Alumnos</h2>
        <table>
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Edad</th>
              <th>Acudiente</th>
              <th>Asistencia</th>
              <th>Faltas</th>
            </tr>
          </thead>
          <tbody>${studentsRows}</tbody>
        </table>

        <h2 style="margin-top: 28px;">Jornadas recientes</h2>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Presentes</th>
              <th>Ausentes</th>
              <th>Justificados</th>
            </tr>
          </thead>
          <tbody>${attendanceRows}</tbody>
        </table>
      </body>
    </html>
  `
}

export function printGroupReport(detail: GroupDetail) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=768')

  if (!printWindow) {
    throw new Error('No fue posible abrir la ventana de impresion.')
  }

  printWindow.document.write(createGroupReportHtml(detail))
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

export async function exportGroupReportPdf(detail: GroupDetail) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const marginX = 40

  pdf.setFontSize(20)
  pdf.text(detail.name, marginX, 50)
  pdf.setFontSize(11)
  pdf.text(`Horario: ${detail.schedule || 'Sin horario definido'}`, marginX, 72)
  pdf.text(`Catequistas: ${detail.catechists.join(', ') || 'Sin asignar'}`, marginX, 88)
  pdf.text(`Descripción: ${detail.description || 'Sin descripción registrada'}`, marginX, 104)

  autoTable(pdf, {
    startY: 126,
    head: [['Indicador', 'Valor']],
    body: [
      ['Alumnos activos', String(detail.studentCount)],
      ['Actividades pendientes', String(detail.pendingActivities)],
      ['Jornadas', String(detail.attendanceSessions.length)],
      ['Actividades', String(detail.activityCount)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [109, 94, 252] },
  })

  autoTable(pdf, {
    startY: (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
      ? ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 140) + 20
      : 220,
    head: [['Alumno', 'Edad', 'Acudiente', 'Asistencia', 'Faltas']],
    body: detail.students.map((student) => [
      student.fullName,
      String(student.age),
      student.primaryGuardianName ?? 'Sin acudiente',
      `${student.attendanceRate.toFixed(0)}%`,
      String(student.absenceCount),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [76, 201, 240], textColor: [20, 30, 48] },
  })

  autoTable(pdf, {
    startY: ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 420) + 20,
    head: [['Fecha', 'Presentes', 'Ausentes', 'Justificados']],
    body: detail.attendanceSessions.slice(0, 20).map((session) => [
      formatDate(session.date),
      String(session.counts.presentes),
      String(session.counts.ausentes),
      String(session.counts.justificados),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [109, 94, 252] },
  })

  pdf.save(`reporte-${detail.year}-${detail.name.toLowerCase().replaceAll(' ', '-')}.pdf`)
}

export async function exportGradesMatrixPdf(
  detail: GroupDetail,
  activities: GroupDetail['allActivities'],
) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  pdf.setFontSize(18)
  pdf.text(`Matriz de calificaciones - ${detail.name}`, 40, 40)

  autoTable(pdf, {
    startY: 60,
    head: [
      [
        'Alumno',
        ...activities.map((activity) => `${activity.title}\n${formatDate(activity.date, 'dd MMM')} • ${activity.maxGrade}`),
      ],
    ],
    body: detail.gradesMatrix.map((row) => [
      row.studentName,
      ...activities.map((activity) => {
        const entry = row.entries.find((grade) => grade.activityId === activity.id)
        return entry?.grade != null ? `${entry.grade}/${entry.maxGrade}` : 'Pendiente'
      }),
    ]),
    styles: { fontSize: 8, cellPadding: 6 },
    headStyles: { fillColor: [109, 94, 252] },
    theme: 'grid',
  })

  pdf.save(`matriz-notas-${detail.year}-${detail.name.toLowerCase().replaceAll(' ', '-')}.pdf`)
}

export async function exportAttendanceMatrixPdf(
  detail: GroupDetail,
  sessions: GroupDetail['attendanceSessions'],
  matrix: GroupDetail['attendanceMatrix'],
) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  pdf.setFontSize(18)
  pdf.text(`Matriz de asistencia - ${detail.name}`, 40, 40)

  autoTable(pdf, {
    startY: 60,
    head: [
      [
        'Alumno',
        ...sessions.map((session) => formatDate(session.date, 'dd MMM')),
      ],
    ],
    body: matrix.map((row) => [
      row.studentName,
      ...row.entries.map((entry) => (entry.status === 'SIN_REGISTRO' ? 'Sin registro' : entry.status)),
    ]),
    styles: { fontSize: 8, cellPadding: 6 },
    headStyles: { fillColor: [76, 201, 240], textColor: [20, 30, 48] },
    theme: 'grid',
  })

  pdf.save(`matriz-asistencia-${detail.year}-${detail.name.toLowerCase().replaceAll(' ', '-')}.pdf`)
}
