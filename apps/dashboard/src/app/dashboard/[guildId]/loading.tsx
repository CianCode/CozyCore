import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>

      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex flex-col items-center sm:items-start">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="mt-2 h-4 w-32" />
              <Skeleton className="mt-2 h-6 w-24" />
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 md:col-span-2 lg:col-span-3" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </main>
    </div>
  );
}
