import express from "express"
import multer from "multer"
import {
  createCase,
  getCase,
  listCases,
  patchCase,
  uploadReport,
  voiceIntake,
  listStaff,
  seedDemoPatients,
  analyzePreview,
  matchPatients,
  deathEstimate,
} from "../controllers/careflow.controller.js"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
})

const router = express.Router()

router.get("/careflow/staff", listStaff)
router.post("/careflow/seed-demo", seedDemoPatients)
router.post("/careflow/case/analyze-preview", analyzePreview)
router.post("/careflow/patients/match", matchPatients)
router.post("/careflow/death/estimate", deathEstimate)
router.post("/careflow/case", createCase)
router.get("/careflow/case/:caseId", getCase)
router.patch("/careflow/case/:caseId", patchCase)
router.post("/careflow/case/:caseId/upload", upload.single("file"), uploadReport)
router.post("/careflow/case/:caseId/voice-intake", voiceIntake)
router.post("/careflow/voice-intake", voiceIntake)
router.get("/careflow/cases", listCases)

export default router
