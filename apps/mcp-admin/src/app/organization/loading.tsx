import { Loader2 } from "lucide-react";

export default function OrganizationLoading() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        {/* Skeleton for header */}
        <div>
          <div className="h-8 bg-muted rounded-md w-64 animate-pulse" />
          <div className="h-4 bg-muted rounded-md w-48 mt-2 animate-pulse" />
        </div>

        {/* Loading indicator */}
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-muted-foreground">
              Loading organization data...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
