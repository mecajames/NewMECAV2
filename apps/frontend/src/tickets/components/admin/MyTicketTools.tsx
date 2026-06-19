import { StaffSignatureEditor } from '@/tickets/pages/admin/StaffSignatureSettingsPage';
import { CannedResponsesManager } from '@/tickets/pages/admin/CannedResponsesSettingsPage';
import { QuickLinksManager } from '@/tickets/pages/admin/QuickLinksSettingsPage';

/**
 * "My Tools" tab for the ticket admin. A per-tech settings area that
 * bundles the support tech's own reply signature and canned responses
 * in one place, so they can set up and edit both without leaving the
 * ticket workspace. Both sub-editors are the same components used by
 * their standalone routes — just embedded without the page chrome.
 */
export function MyTicketTools() {
  return (
    <div className="space-y-10">
      <section className="bg-slate-800/40 rounded-xl border border-slate-700 p-6">
        <StaffSignatureEditor />
      </section>
      <section className="bg-slate-800/40 rounded-xl border border-slate-700 p-6">
        <CannedResponsesManager />
      </section>
      <section className="bg-slate-800/40 rounded-xl border border-slate-700 p-6">
        <QuickLinksManager />
      </section>
    </div>
  );
}

export default MyTicketTools;
