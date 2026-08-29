import { redirect } from "next/navigation";

/**
 * Orders opens on Offers.
 *
 * <p>The section's real work is the offer list; order confirmations and delivery notes only exist
 * once an offer does. The route stays so existing links and bookmarks keep working instead of
 * landing on a page of headings that linked somewhere else anyway.
 */
export default function OrdersPage() {
  redirect("/quotes");
}
