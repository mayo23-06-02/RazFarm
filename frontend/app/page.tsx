import { redirect } from "next/navigation";

// The login screen (app/(auth)/login) is the front door — visitors land
// straight on it instead of a marketing/docs page.
export default function Home() {
  redirect("/login");
}
