/** Demo Settings — Account / Shop / Appearance tabs over mock data. */
import { useState } from "react";
import {
  User, Store, Palette, Mail, Phone, CheckCircle2, Instagram, RefreshCw, Users,
  Image as ImageIcon, Bell, Trash2, Copy, ExternalLink, Languages, SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { demoProfile, demoCoreFilters, demoAttributeFilters } from "./data";
import { showSuccess } from "@/utils/toast";

const PreferenceRow = ({ label, desc, defaultChecked }: any) => (
  <div className="flex items-center justify-between rounded-lg border p-3">
    <div><div className="flex items-center gap-2"><span className="text-sm font-medium">{label}</span><Badge variant="secondary" className="text-[10px]">coming soon</Badge></div><p className="text-xs text-muted-foreground">{desc}</p></div>
    <Switch defaultChecked={defaultChecked} disabled />
  </div>
);

const FilterRow = ({ label, checked, onToggle }: any) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm font-medium">{label}</span>
    <Switch checked={checked} onCheckedChange={onToggle} />
  </div>
);

const DemoSettings = () => {
  const [tab, setTab] = useState("account");
  const [core, setCore] = useState(demoCoreFilters);
  const [attrs, setAttrs] = useState(demoAttributeFilters);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 grid h-12 w-full grid-cols-3">
          {[["account", User, "Account", "text-blue-600"], ["shop", Store, "Shop", "text-emerald-600"], ["appearance", Palette, "Appearance", "text-violet-600"]].map(([k, Icon, label, color]: any) => (
            <TabsTrigger key={k} value={k} className="h-10 gap-2">
              <Icon className={cn("h-4 w-4", tab === k && color)} /> <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ACCOUNT */}
        <TabsContent value="account" className="space-y-6">
          <Card><CardContent className="pt-6">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <Avatar className="h-20 w-20 ring-2 ring-border"><AvatarImage src={demoProfile.logo_url} /><AvatarFallback className="text-2xl font-semibold">EK</AvatarFallback></Avatar>
              <div className="text-center sm:text-left">
                <h3 className="text-xl font-semibold">Elira Kola</h3>
                <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start"><Mail className="h-3.5 w-3.5" /> elira@butikuielires.al</p>
                <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start"><Phone className="h-3.5 w-3.5" /> +355 69 000 0000</p>
                <div className="pt-2">
                  <Badge variant="secondary" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950"><CheckCircle2 className="h-3.5 w-3.5" /> Connected · @butikuielires</Badge>
                </div>
              </div>
            </div>
          </CardContent></Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Instagram className="h-4 w-4" /> Instagram integration</CardTitle><CardDescription>Your posts sync automatically.</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border bg-accent p-4 text-accent-foreground">
                <div className="flex items-center gap-3">
                  <Instagram className="h-6 w-6" />
                  <div><p className="font-semibold">Facebook / Instagram</p><p className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Connected</p></div>
                </div>
                <Button variant="destructive" size="sm">Disconnect</Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><Languages className="h-4 w-4" /> Language</label>
                  <Select defaultValue="sq"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="sq">Albanian (Shqip)</SelectItem></SelectContent></Select>
                </div>
                <h4 className="flex items-center gap-1.5 pt-1 text-sm font-medium"><Bell className="h-4 w-4" /> Email notifications</h4>
                <PreferenceRow label="New sale" desc="Get an email on every order." />
                <PreferenceRow label="Weekly summary" desc="A recap of your week." defaultChecked />
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-4 w-4" /> Danger zone</CardTitle></CardHeader>
              <CardContent>
                <Button variant="destructive" className="w-full">Delete account</Button>
                <p className="mt-2 text-xs text-muted-foreground">This permanently deletes your shop, products and orders.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SHOP */}
        <TabsContent value="shop" className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-xl border bg-accent/40 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10"><Store className="h-4 w-4 text-primary" /></span>
              <div><p className="text-xs text-muted-foreground">Storefront URL</p><p className="truncate font-medium">vela.al/shop/butiku-i-elires</p></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => showSuccess("Copied (demo)")}><Copy className="mr-1.5 h-4 w-4" /> Copy</Button>
              <Button variant="outline" size="icon"><ExternalLink className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Shop details</CardTitle><CardDescription>How your storefront presents your brand.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div><label className="mb-1.5 block text-sm font-medium">Shop name</label><Input defaultValue="Butiku i Elirës" /></div>
                  <div><label className="mb-1.5 block text-sm font-medium">Headline</label><Input defaultValue="Koleksioni i verës ☀️ — deri në -30%" /></div>
                </div>
                <div><label className="mb-1.5 block text-sm font-medium">About</label><Textarea rows={4} defaultValue="Veshje & aksesorë të përzgjedhur me dashuri, direkt nga Instagrami ynë." /></div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div><label className="mb-1.5 block text-sm font-medium">Contact email</label><Input type="email" defaultValue="demo@butikuielires.al" /></div>
                  <div><label className="mb-1.5 block text-sm font-medium">Currency</label>
                    <Select defaultValue="ALL"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">ALL — Albanian Lek</SelectItem><SelectItem value="EUR">EUR — Euro</SelectItem><SelectItem value="USD">USD — Dollar</SelectItem></SelectContent></Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t pt-6"><Button onClick={() => showSuccess("Saved (demo)")}>Save changes</Button></CardFooter>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div><CardTitle className="flex items-center gap-2 text-base"><Instagram className="h-4 w-4" /> Instagram</CardTitle><CardDescription>Synced · read-only</CardDescription></div>
                  <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <Avatar className="h-12 w-12"><AvatarImage src={demoProfile.logo_url} /><AvatarFallback>BE</AvatarFallback></Avatar>
                    <div><p className="font-semibold">{demoProfile.shop_name}</p><p className="text-sm text-muted-foreground">@{demoProfile.username}</p></div>
                  </div>
                  {[[Users, "Followers", demoProfile.followers.toLocaleString()], [ImageIcon, "Posts", demoProfile.posts.toLocaleString()]].map(([Icon, l, v]: any) => (
                    <div key={l} className="flex items-start gap-3"><Icon className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{l}</p><p className="font-medium">{v}</p></div></div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><SlidersHorizontal className="h-4 w-4" /> Storefront filters</CardTitle><CardDescription>Which filters shoppers can use.</CardDescription></CardHeader>
                <CardContent>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Core</p>
                  {core.map((f, i) => <FilterRow key={f.key} label={f.label} checked={f.visible} onToggle={() => setCore((p) => p.map((x, j) => (i === j ? { ...x, visible: !x.visible } : x)))} />)}
                  <p className="mb-1 mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Attributes</p>
                  {attrs.map((f, i) => <FilterRow key={f.key} label={f.label} checked={f.visible} onToggle={() => setAttrs((p) => p.map((x, j) => (i === j ? { ...x, visible: !x.visible } : x)))} />)}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* APPEARANCE */}
        <TabsContent value="appearance">
          <Alert>
            <Palette className="h-4 w-4" />
            <AlertTitle>Storefront Studio</AlertTitle>
            <AlertDescription>
              Design your storefront — colors, fonts, layout, templates and sections — in the Storefront Studio.
              Open the <strong>Storefront Studio</strong> item in the sidebar to try switching between all 8 premium templates live.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DemoSettings;
