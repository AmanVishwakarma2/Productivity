const isProduction = import.meta.env.PROD;

export const API_URL = isProduction
  ? "https://productivity-backend-mq31.onrender.com/api"
  : "/api"; // <-- this is the trick
