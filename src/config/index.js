import dotenv from "dotenv"
dotenv.config()

export default {
    BREVO_API_KEY:process.env.BREVO_API_KEY,
    BREVO_EMAIL:process.env.BREVO_EMAIL
}