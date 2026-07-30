import express from "express"
import { createCase, getCase, listCases } from "../controllers/careflow.controller.js"

const router = express.Router()

router.post("/careflow/case", createCase)
router.get("/careflow/case/:caseId", getCase)
router.get("/careflow/cases", listCases)

export default router
