import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { showSuccess, showError } from "@/utils/toast";

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
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          if (session?.provider_token) {
            const { error } = await supabase
              .from('integrations')
              .upsert({
                user_id: session.user.id,
                provider: 'facebook',
                access_token: session.provider_token,
              }, { onConflict: 'user_id,provider' });

            if (error) {
              showError("Could not save your Instagram connection. Please try reconnecting in settings.");
              console.error("Error saving provider token:", error);
            } else {
              showSuccess("Successfully connected to Instagram!");
            }
          }
        } else if (event === 'SIGNED_OUT') {
          navigate("/login");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  return <Outlet />;
};

export default ProtectedRoute;