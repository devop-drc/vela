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
          This is a common step that sometimes requires specific actions within Instagram and Facebook.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Step 1: Convert to Business/Creator Account
          </h4>
          <p className="text-sm text-muted-foreground pl-6">
            In your Instagram mobile app, go to **Settings and privacy &gt; Account type and tools &gt; Switch to professional account**.
            Choose either "Business" or "Creator".
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Step 2: Link to a Facebook Page
          </h4>
          <p className="text-sm text-muted-foreground pl-6">
            During the professional account setup, you'll be prompted to connect to a Facebook Page.
            If you skipped it, go to **Instagram Profile &gt; Edit Profile &gt; Page** and select the Facebook Page you manage.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Step 3: Grant All Permissions
          </h4>
          <p className="text-sm text-muted-foreground pl-6">
            When you click "Connect with Facebook" below, a popup will ask for permissions.
            **Crucially, click "Edit Settings" and ensure ALL requested permissions are granted** for both your Facebook Page and your Instagram account.
            Without all permissions, the integration will fail.
          </p>
        </div>

        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md mt-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">Need More Help?</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              If you're still having trouble, Instagram's official guide can walk you through it.
            </p>
          </div>
        </div>
      </div>

      <DialogFooter className="sm:justify-between">
        <Button variant="outline" asChild>
          <a href={INSTAGRAM_SETUP_GUIDE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            View Official Guide
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
          // Request all necessary scopes for Instagram Business integration
          scopes: 'email,public_profile,pages_show_list,instagram_basic,instagram_manage_insights,instagram_manage_comments,instagram_content_publish,pages_read_engagement,pages_manage_posts,pages_manage_metadata',
          queryParams: {
            auth_type: 'rerequest', // Ensure permissions are re-requested if previously denied
            access_type: 'offline',
          },
        },
      });

      if (error) {
        // If the error indicates a permission issue, show the setup guide
        if (error.message.includes('permission') || error.message.includes('scope') || error.message.includes('access')) {
          showError(`Login failed due to missing permissions. Please review the setup guide.`);
          setShowSetupGuide(true);
        } else {
          showError(`Login failed: ${error.message}`);
        }
      } else {
        // Supabase will handle the redirect to /onboarding or / after successful auth
        showSuccess('Redirecting to complete login...');
      }
    } catch (error) {
      console.error('Login error:', error);
      showError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <InstagramSetupGuide open={showSetupGuide} onOpenChange={setShowSetupGuide} />
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
          <Button variant="link" onClick={() => setShowSetupGuide(true)} className="w-full text-sm text-primary">
            <Instagram className="mr-2 h-4 w-4" />
            Instagram Setup Guide
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;