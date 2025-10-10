import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ShoppingBag, Facebook, Instagram, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const INSTAGRAM_SETUP_GUIDE_URL = 'https://help.instagram.com/502981923235522';

const InstagramSetupGuide = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Instagram className="h-5 w-5 text-pink-600" />
          Instagram Business Setup Required
        </DialogTitle>
        <DialogDescription>
          To use InstaShop, you need to connect an Instagram Business or Creator account to your Facebook page.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Step 1: Convert to Business/Creator Account
          </h4>
          <p className="text-sm text-muted-foreground pl-6">
            Go to your Instagram app settings and switch to a Business or Creator account.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Step 2: Connect to a Facebook Page
          </h4>
          <p className="text-sm text-muted-foreground pl-6">
            In Instagram settings, go to Account &gt; Linked Accounts and connect to a Facebook Page you manage.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Step 3: Grant Permissions
          </h4>
          <p className="text-sm text-muted-foreground pl-6">
            Make sure to grant all necessary permissions when prompted during login.
          </p>
        </div>

        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md mt-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">Need Help?</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Follow our detailed setup guide for step-by-step instructions with screenshots.
            </p>
          </div>
        </div>
      </div>

      <DialogFooter className="sm:justify-between">
        <Button variant="outline" asChild>
          <a href={INSTAGRAM_SETUP_GUIDE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            View Setup Guide
          </a>
        </Button>
        <Button onClick={() => onOpenChange(false)}>I've Completed Setup</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const Login = () => {
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const navigate = useNavigate();

  const handleFacebookLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'email,public_profile,instagram_basic,pages_show_list,instagram_manage_insights,instagram_content_publish,instagram_manage_comments,instagram_manage_messages,pages_read_engagement,pages_manage_posts,pages_manage_metadata', // Added more scopes
          queryParams: {
            auth_type: 'rerequest',
            access_type: 'offline',
          },
        },
      });

      if (error) {
        if (error.message.includes('permission') || error.message.includes('scope')) {
          setShowSetupGuide(true);
        } else {
          showError(`Login failed: ${error.message}`);
        }
      } else {
        // Check if user has connected Instagram Business account
        // This would be done in a server-side function after successful login
        // For now, we'll assume it's successful and redirect
        showSuccess('Successfully logged in!');
        navigate('/onboarding');
      }
    } catch (error) {
      console.error('Login error:', error);
      showError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <div className="w-full max-w-md p-8 space-y-8 text-center">
        <div className="flex justify-center items-center gap-4 mb-4">
          <ShoppingBag className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold font-heading">Your InstaShop</h1>
        </div>
        <p className="text-muted-foreground">
          Create your account and start selling by connecting your Instagram Business profile.
        </p>
        <div className="space-y-2">
          <Button onClick={handleFacebookLogin} size="lg" className="w-full">
            <Facebook className="mr-2 h-5 w-5" />
            Connect with Facebook
          </Button>
          <Button asChild variant="link" className="text-muted-foreground">
            <Link to="/demo">See what the app is like</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;