import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Facebook } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleFacebookLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        scopes: 'public_profile,email,pages_show_list,instagram_basic,instagram_content_publish,pages_read_engagement,business_management',
        redirectTo: window.location.origin,
      }
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <div className="w-full max-w-md p-8 space-y-8 text-center">
        <div className="flex justify-center items-center gap-4 mb-4">
          <ShoppingBag className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold font-heading">InstaShopify</h1>
        </div>
        <p className="text-muted-foreground">
          Create your account and start selling by connecting your Instagram Business profile.
        </p>
        <Button onClick={handleFacebookLogin} size="lg" className="w-full">
          <Facebook className="mr-2 h-5 w-5" />
          Connect with Facebook
        </Button>
      </div>
    </div>
  );
};

export default Login;