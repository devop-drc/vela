import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";

const DetailDisplayRow = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="flex flex-col">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        <div className="font-medium flex flex-wrap items-center gap-1.5 text-base">
            {children}
        </div>
    </div>
);

export const DynamicDetailRenderer = ({ details }: { details: any[] }) => {
    if (!details || details.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">No specific details provided.</p>;
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            {details.map((detail, index) => (
                <DetailDisplayRow key={index} label={detail.name}>
                    {Array.isArray(detail.value) ? (
                        detail.value.map((val, i) => <Badge key={i} variant="outline">{val}</Badge>)
                    ) : typeof detail.value === 'boolean' ? (
                        <div className="flex items-center gap-2">
                            {detail.value ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-destructive" />}
                            <span>{detail.value ? 'Yes' : 'No'}</span>
                        </div>
                    ) : (
                        <p className="text-base">{detail.value} {detail.unit}</p>
                    )}
                </DetailDisplayRow>
            ))}
        </div>
    );
};