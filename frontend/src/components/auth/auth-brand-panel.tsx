import { AuthDashboardPreview } from "@/components/auth/auth-dashboard-preview";

export function AuthBrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-center lg:px-12 lg:py-16 xl:px-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden="true"
      >
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[40px] border-white/20" />
        <div className="absolute -bottom-32 -left-16 h-[28rem] w-[28rem] rounded-full border-[50px] border-white/10" />
        <div className="absolute right-1/4 top-1/3 h-48 w-48 rounded-full border-[30px] border-white/15" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-2xl space-y-10">
        <div className="space-y-4 text-white">
          <h2 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
            Effortlessly manage your team and operations.
          </h2>
          <p className="max-w-lg text-base text-white/80 xl:text-lg">
            Log in to access your CRM dashboard and manage clients, projects, quotes, and
            invoices.
          </p>
        </div>

        <AuthDashboardPreview />
      </div>
    </aside>
  );
}
