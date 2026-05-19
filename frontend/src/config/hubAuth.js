import { signInWithEmailAndPassword } from "firebase/auth";
import { hubAuth } from "./firebaseHub";


const HUB_EMAIL    = import.meta.env.VITE_HUB_BANK_EMAIL    || "";
const HUB_PASSWORD = import.meta.env.VITE_HUB_BANK_PASSWORD || "";

export const signInToHub = async () => {
  if (!HUB_EMAIL || !HUB_PASSWORD) {
    console.warn("[HUB AUTH] Hub credentials not set — interbank transfers will be disabled.");
    return;
  }
  try {
    await signInWithEmailAndPassword(hubAuth, HUB_EMAIL, HUB_PASSWORD);
    console.log("[HUB AUTH] Sid Bank signed into BMS hub successfully");
  } catch (err) {
    console.warn("[HUB AUTH] Failed:", err.message);
  }
};