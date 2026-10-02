import "dotenv/config";
import app from "./app.js";

const port = Number.parseInt(process.env.PORT || "8080", 10);
const resolvedPort = Number.isNaN(port) ? 8080 : port;

app.listen(resolvedPort, () => {
  console.log(`Server running on port ${resolvedPort}`);
});
