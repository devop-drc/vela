import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";

const ProtectedRoute = () => {
  const navigate = useNavigate();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
      setIsInitialized(true);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          navigate("/login");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;