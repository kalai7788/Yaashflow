// src/hooks/useAuth.js
import { useContext } from "react";
import AuthContext from "../contexts/AuthContextValue"; // default import

export function useAuth() {
  return useContext(AuthContext);
}
