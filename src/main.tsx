import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { runSplashNarration } from "./splash";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

void runSplashNarration().catch((err) => {
  console.warn("splash narration failed", err);
  document.getElementById("splash")?.remove();
});