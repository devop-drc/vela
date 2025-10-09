import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Link as LinkIcon, LogOut, User as UserIcon, Settings } from "lucide-react"; // Import LogOut, UserIcon, and Settings
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAppearance } from "@/contexts/AppearanceContext";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useShop } from "@/contexts/ShopContext";
import { showSuccess, showError } from "@/utils/toast";
import { useState, useEffect } from "react"; // Import useState and useEffect

interface HeaderProps {
  title: string;
}

const Header = ({ title }: HeaderProps) => {
  const navigate = useNavigate();
  const { settings } = useAppearance();
  const { shopDetails } = useShop();
  const isFloating = settings.layoutStyle === 'floating';
  const blurEnabled = settings.blurEnabled;
  const [user, setUser] = useState<any>(null); // State to hold user info

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const headerLeftMarginClasses = {
    compact: 'md:left-[calc(14rem+2rem)]', // 224px + 32px
    default: 'md:left-[calc(16rem+2rem)]', // 256px + 32px
    spacious: 'md:left-[calc(18rem+2rem)]', // 288px + 32px
  };

  const handleCopyStorefrontUrl = async () => {
    if (shopDetails?.slug) {
      const storefrontUrl = `${window.location.origin}/shop/${shopDetails.slug}`;
      try {
        await navigator.clipboard.writeText(storefrontUrl);
        showSuccess("Storefront URL copied to clipboard!");
      } catch (err) {
        showError("Failed to copy URL. Please try again manually.");
        console.error("Failed to copy storefront URL:", err);
      }
    } else {
      showError("Your shop URL is not available yet. Please set your shop name in settings.");
    }
  };

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-30 flex items-center justify-between h-16 px-6 transition-all",
      isFloating
        ? "top-4 right-4 left-4 border rounded-lg"
        : "border-b", // Docked layout has border-b and expands
      isFloating && (headerLeftMarginClasses[settings.sidebarWidth || 'default']),
      blurEnabled ? "bg-card/80 backdrop-blur-[20px]" : "bg-card",
      !isFloating && "md:ml-[calc(var(--sidebar-width)+2rem)] md:pr-8" // Ensure full width for docked
    )} style={{ '--sidebar-width': settings.sidebarWidth === 'compact' ? '14rem' : settings.sidebarWidth === 'spacious' ? '18rem' : '16rem' } as React.CSSProperties}>
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold hidden md:block">{title}</h1>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-8 w-full"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleCopyStorefrontUrl}
          disabled={!shopDetails?.slug}
        >
          <LinkIcon className="mr-2 h-4 w-4" />
          Get Storefront URL
        </Button>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.user_metadata?.avatar_url || undefined} alt={user.user_metadata?.first_name || "User"} />
                  <AvatarFallback>
                    {user.user_metadata?.first_name?.[0] || <UserIcon className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name || user.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export default Header;