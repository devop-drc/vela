import { useIntegration } from '@/contexts/IntegrationContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, UserCircle, Mail, FileText } from "lucide-react";

const permissions = [
  {
    icon: UserCircle,
    name: "Profile Information",
    description: "To create your account with your name and profile picture.",
  },
  {
    icon: Mail,
    name: "Email Address",
    description: "To securely log you into your dashboard.",
  },
  {
    icon: FileText,
    name: "Instagram Posts & Media",
    description: "To access your posts, allowing you to import them as products.",
  },
];

export const IntegrationPrompt = () => {
  const { isPromptOpen, closePrompt } = useIntegration();

  const handleConnect = () => {
    closePrompt();
    const origin = `${window.location.origin}/settings`;
    window.location.href = `https://ixiafbgaqszlokmzjjio.supabase.co/functions/v1/instagram-auth?origin=${encodeURIComponent(origin)}`;
  };

  return (
    <Dialog open={isPromptOpen} onOpenChange={closePrompt}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Connect to Instagram</DialogTitle>
          <DialogDescription className="pt-2 text-center text-base">
            To get started, we need to securely connect to your Instagram Business account. This allows us to import your posts and turn them into products.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 space-y-4">
          <h3 className="font-semibold text-center">We'll ask for the following permissions:</h3>
          <div className="space-y-4 rounded-lg border p-4">
            {permissions.map((permission) => (
              <div key={permission.name} className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-2">
                  <permission.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">{permission.name}</p>
                  <p className="text-sm text-muted-foreground">{permission.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            We only request the permissions necessary to provide our services. We will never post on your behalf without your explicit action.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleConnect} className="w-full" size="lg">
            <ShieldCheck className="mr-2 h-5 w-5" />
            Securely Connect with Facebook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};