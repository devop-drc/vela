/** Auth pages shell — just the AuthProvider, as its own lazy chunk so the
 *  landing/storefronts never load Supabase auth wiring they don't use. */
import { Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

const AuthShell = () => (
  <AuthProvider>
    <Outlet />
  </AuthProvider>
);

export default AuthShell;
