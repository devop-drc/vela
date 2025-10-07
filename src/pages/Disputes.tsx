import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquareWarning, CheckCircle, XCircle, Search, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from "@/utils/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DisputeDetailModal } from "@/components/DisputeDetailModal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Dispute {
  id: string;
  order_id: string;
  customer_email: string;
  reason: string;
  message: string | null;
  status: 'Open' | 'In Review' | 'Resolved' | 'Closed';
  reply_message: string | null;
  created_at: string;
  updated_at: string;
}

const Disputes = () => {
  const { setTitle } = usePageTitle();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  useEffect(() => {
    setTitle("Client Disputes");
  }, [setTitle]);

  const fetchDisputes = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("You must be logged in to view disputes.");
      setIsLoading(false);
      return;
    }

    // Fetch business ID for RLS
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      showError("Could not find your business profile.");
      setIsLoading(false);
      return;
    }

    let query = supabase
      .from("order_disputes")
      .select(`
        *,
        orders(business_id)
      `)
      .order("created_at", { ascending: false });

    if (statusFilter !== "All") {
      query = query.eq("status", statusFilter);
    }

    // Apply RLS implicitly by user_id in the policy
    const { data, error } = await query;

    if (error) {
      showError("Could not fetch disputes.");
    } else {
      // Filter disputes by business_id on the client side if RLS doesn't fully cover it
      // (though the RLS policy should handle this on the server)
      const filteredData = data.filter(d => d.orders?.business_id === business.id);
      setDisputes(filteredData as Dispute[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDisputes();
  }, [statusFilter]);

  const handleUpdate = () => {
    fetchDisputes();
    setSelectedDispute(null);
  };

  const filteredDisputes = disputes.filter(dispute =>
    dispute.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispute.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispute.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: Dispute['status']) => {
    switch (status) {
      case 'Open': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'In Review': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Resolved': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Closed': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <>
      {selectedDispute && (
        <DisputeDetailModal
          isOpen={!!selectedDispute}
          onClose={() => setSelectedDispute(null)}
          dispute={selectedDispute}
          onUpdate={handleUpdate}
        />
      )}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Client Disputes</h1>
            <p className="text-muted-foreground">
              Manage customer issues and provide timely resolutions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by Order ID, Email, or Reason..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Review">In Review</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Disputes</CardTitle>
            <CardDescription>
              Review and respond to customer reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer Email</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDisputes.length > 0 ? (
                    filteredDisputes.map((dispute) => (
                      <TableRow key={dispute.id} onClick={() => setSelectedDispute(dispute)} className="cursor-pointer hover:bg-accent">
                        <TableCell className="font-medium">#{dispute.order_id.substring(0, 8)}</TableCell>
                        <TableCell>{dispute.customer_email}</TableCell>
                        <TableCell>{dispute.reason}</TableCell>
                        <TableCell><Badge variant="outline" className={cn("font-normal", getStatusColor(dispute.status))}>{dispute.status}</Badge></TableCell>
                        <TableCell>{new Date(dispute.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedDispute(dispute); }}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No disputes found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Disputes;