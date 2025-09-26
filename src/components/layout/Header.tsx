import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search } from "lucide-react";
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

interface HeaderProps {
  title: string;
}

const Header = ({ title }: HeaderProps) => {
  const navigate = useNavigate();
  const { settings } = useAppearance();
  const isFloating = settings.layoutStyle === 'floating';
  const blurEnabled = settings.blurEnabled;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const headerLeftMarginClasses = {
    compact: 'md:left-[calc(14rem+2rem)]', // 224px + 32px
    default: 'md:left-[calc(16rem+2rem)]', // 256px + 32px
    spacious: 'md:left-[calc(18rem+2rem)]', // 288px + 32px
  };

  return (
    <header className={cn(
      "z-30 flex items-center justify-between h-16 px-6 transition-all",
      isFloating
        ? "fixed top-4 right-4 left-4 border rounded-lg"
        : "border-b",
      isFloating && (headerLeftMarginClasses[settings.sidebarWidth || 'default']),
      blurEnabled ? "bg-card/80 backdrop-blur-lg" : "bg-card"
    )}>
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Billing</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default Header;