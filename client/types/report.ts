import type { Account } from "./account.ts";

export type Report = {
    id: string;
    action_taken: boolean;
    action_taken_at: string | null;
    status_ids: string[] | null;
    rule_ids: string[] | null;
    // These parameters don't exist in Pleroma
    category: Category | null;
    comment: string | null;
    forwarded: boolean | null;
    target_account?: Account | null;
};

export type Category = "spam" | "violation" | "other";
