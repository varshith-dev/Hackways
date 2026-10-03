import { redirect } from "next/navigation";

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  redirect("/login");
}
