import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/sessionToken";
import { isSuperAdminEmail } from "@/lib/platformSettings";

export default async function ConsoleRootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = verifySessionToken(token);

  if (claims && (claims.role === "admin" || isSuperAdminEmail(claims.email))) {
    redirect("/console/super-admin/overview");
  }

  redirect("/console/organizer/overview");
}
