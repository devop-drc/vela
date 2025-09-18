import { Button } from "@/components/ui/button";
import { ShoppingBag, Facebook } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

const Login = () => {
  const handleFacebookLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      showError(`Login failed: ${error.message}`);
    }
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