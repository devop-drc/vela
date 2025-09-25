import { Badge } from "@/components/ui/badge";

interface SpecParserProps {
  label: string;
  value: string | string[];
}

const SpecParser = ({ label, value }: SpecParserProps) => {
  if (!value) {
    return null;
  }

  // Handle values that are already arrays (like from tags)
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((item, index) => (
          <Badge key={index} variant="outline">{item}</Badge>
        ))}
      </div>
    );
  }

  const items = String(value).split(/, ?/);
  const lowerLabel = label.toLowerCase();

  // Apply badge styling for specific spec types that are often lists
  if (
    items.length > 1 &&
    (lowerLabel.includes('camera') ||
     lowerLabel.includes('model') ||
     lowerLabel.includes('storage') ||
     lowerLabel.includes('connectivity'))
  ) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <Badge key={index} variant="outline" className="font-normal">{item.trim()}</Badge>
        ))}
      </div>
    );
  }

  // Default rendering for other specs
  return <p className="text-base">{value}</p>;
};

export default SpecParser;