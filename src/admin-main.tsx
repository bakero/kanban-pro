import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AdminConsoleApp from "./AdminConsoleApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminConsoleApp />
  </StrictMode>
);
