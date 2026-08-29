import { redirect } from "next/navigation";

/**
 * Editing happens in a dialog over the contact list, not on its own page.
 *
 * <p>The route stays so links and bookmarks that already point here keep working: it forwards to
 * the list with the contact selected, which opens the same form.
 */
export default async function EditClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  redirect(`/clients?edit=${clientId}`);
}
