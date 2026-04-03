import { Outlet } from "@/lib/router";
import { GraceSidebar } from "./GraceSidebar";
import { ToastViewport } from "@/components/ToastViewport";

export function GraceLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <GraceSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
