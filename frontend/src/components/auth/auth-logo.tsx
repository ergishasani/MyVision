import Link from "next/link";

export function AuthLogo() {
  return (
    <Link href="/login" className="inline-flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 text-white"
          aria-hidden="true"
        >
          <path
            d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5L12 3Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="text-xl font-bold tracking-tight text-foreground">MyVision</span>
    </Link>
  );
}
