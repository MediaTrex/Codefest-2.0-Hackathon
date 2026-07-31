import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export function downloadExcel(c) {
  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      {
        'Case ID': c.caseId,
        Patient: c.patientName,
        Age: c.patient_information?.age ?? c.age ?? '',
        Gender: c.patient_information?.gender ?? c.gender ?? '',
        Urgency: c.urgency,
        'Assigned Doctor': c.assignedDoctor?.name ?? '',
        'AI Narrative': c.aiNarrative,
        'AI Confidence': c.aiConfidence,
        'Next Follow-up': c.nextFollowUpDate ?? '',
        Created: c.createdAt,
        Description: c.description ?? '',
        'Top Diagnosis': c.topDiagnosis ?? '',
      },
    ]),
    'Summary'
  )

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(c.labs?.length ? c.labs : [{ name: '', status: '', resultSummary: '' }]),
    'Labs'
  )

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      c.prescriptions?.length
        ? c.prescriptions
        : [{ drug: '', dose: '', frequency: '', source: '' }]
    ),
    'Prescriptions'
  )

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      (c.uploadedReports ?? []).length
        ? (c.uploadedReports ?? []).map((r) => ({
            File: r.fileName,
            Type: r.type,
            Uploaded: r.uploadedAt,
            'AI Narrative': r.aiNarrative,
            Confidence: r.aiConfidence,
          }))
        : [{ File: '', Type: '', Uploaded: '', 'AI Narrative': '', Confidence: '' }]
    ),
    'Uploaded Reports'
  )

  if (c.autopsyEstimate) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        {
          'Estimated Range Start': c.autopsyEstimate.timeOfDeathRangeStart,
          'Estimated Range End': c.autopsyEstimate.timeOfDeathRangeEnd,
          Confidence: c.autopsyEstimate.aiConfidence,
          Narrative: c.autopsyEstimate.aiNarrative,
          Disclaimer:
            'AI-generated estimate for workflow demonstration only — not a certified forensic or medical-legal determination.',
        },
      ]),
      'Autopsy Estimate'
    )
  }

  XLSX.writeFile(wb, `CarePilot_Report_${c.caseId}.xlsx`)
}

export async function downloadPdf(caseData) {
  const el = document.querySelector('.cf-report-doc')
  if (!el) return

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  })
  const img = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'pt', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgHeight = (canvas.height * pageWidth) / canvas.width

  let heightLeft = imgHeight
  let position = 0

  pdf.addImage(img, 'PNG', 0, position, pageWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(img, 'PNG', 0, position, pageWidth, imgHeight)
    heightLeft -= pageHeight
  }

  pdf.save(`CarePilot_Report_${caseData.caseId}.pdf`)
}
