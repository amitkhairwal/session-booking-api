import "dotenv/config";
import mongoose from "mongoose";
import { app } from "./app";

const { MONGODB_URI, PORT = "3000" } = process.env;

async function main() {
  if (!MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(MONGODB_URI);
  app.listen(Number(PORT), () => console.log(`Listening on :${PORT}`));
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
