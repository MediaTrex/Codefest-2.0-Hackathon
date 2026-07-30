import express from "express"
import dotenv from "dotenv"
import careflowRouter from "./routes/careflow.route.js"
dotenv.config()

const port = process.env.PORT

const app = express()

app.use(express.json({ limit: "8mb" }))
app.use("/", careflowRouter)

app.use((err, req, res, next) => {
  console.log(err)

  if (err.status) {
    return res.status(err.status).json(err.data)
  }

  return res.status(500).json({ message: `agent error ${err}` })
})

app.get("/", (req, res) => {
  res.json({ message: "CareFlow AI agent service" })
})

app.listen(port, () => {
  console.log(`CareFlow AI agent service started at ${port}`)
})
