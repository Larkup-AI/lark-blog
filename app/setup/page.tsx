import { redirect } from "next/navigation";
import { getSetupState } from "@/app/actions/setup";
import { getSession, isFullAdmin } from "@/lib/admin";
import { SetupWizard } from "./setup-wizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Setup" };

export default async function SetupPage() {
  const state = await getSetupState();

  // Once setup is complete AND an admin exists, only an admin may re-run it.
  if (state.setupComplete && state.hasAdmin) {
    const session = await getSession();
    if (!session?.user || !isFullAdmin(session.user)) {
      redirect("/");
    }
  }

  return <SetupWizard initialState={state} />;
}
