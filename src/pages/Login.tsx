import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Instagram, ShoppingBag } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        navigate("/");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleFacebookLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        scopes: 'public_profile,pages_show_list,instagram_basic,instagram_content_publish,pages_read_engagement,business_management',
      }
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <div className="w-full max-w-md p-8 space-y-8 text-center">
        <div className="flex justify-center items-center gap-4 mb-6">
          <ShoppingBag className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold font-heading">InstaShopify</h1>
        </div>
        <p className="text-muted-foreground">
          Turn your Instagram posts into a shoppable storefront.
        </p>
        <Button onClick={handleFacebookLogin} size="lg" className="w-full">
          <Instagram className="mr-2 h-5 w-5" />
          Sign In with Facebook
        </Button>
        <p className="text-xs text-muted-foreground pt-4">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Login;