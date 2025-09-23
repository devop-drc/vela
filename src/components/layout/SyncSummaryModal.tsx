import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle, SkipForward, RefreshCw, AlertTriangle } from "lucide-react";

const StatCard = ({ icon: Icon, title, value, color }: any) => (
  <div className="flex items-center gap-4 p-4 border rounded-lg">
    <div className={`p-2 rounded-full ${color.bg}`}>
      <Icon className={`h-6 w-6 ${color.text}`} />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

export const SyncSummaryModal = ({ job, isOpen, onClose }: { job: any; isOpen: boolean; onClose: () => void; }) => {
  if (!job) return null;

  const summary = job.summary || {};
  const isSuccess = job.status === 'completed';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSuccess ? <CheckCircle className="h-6 w-6 text-emerald-500" /> : <AlertTriangle className="h-6 w-6 text-destructive" />}
            Sync {isSuccess ? 'Completed' : 'Failed'}
          </DialogTitle>
          <DialogDescription>
            {isSuccess ? 'Here is a summary of the sync process.' : 'The sync process failed. See the error message below.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isSuccess ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard icon={CheckCircle} title="Products Created" value={summary.created || 0} color={{ bg: 'bg-emerald-100', text: 'text-emerald-700' }} />
              <StatCard icon={RefreshCw} title="Products Updated" value={summary.updated || 0} color={{ bg: 'bg-blue-100', text: 'text-blue-700' }} />
              <StatCard icon={SkipForward} title="Posts Skipped" value={summary.skipped || 0} color={{ bg: 'bg-slate-100', text: 'text-slate-700' }} />
            </div>
          ) : (
            <div className="p-4 border rounded-lg bg-destructive/10 text-destructive">
              <p className="font-semibold">Error Message:</p>
              <p className="text-sm">{job.message}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};