import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex w-full flex-1 flex-col overflow-auto p-4 md:gap-8 md:p-8">
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    </div>);

}