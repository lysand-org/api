import type { Emoji } from "./emoji.ts";
import type { Field } from "./field.ts";

export type FollowRequest = {
    id: number;
    username: string;
    acct: string;
    display_name: string;
    locked: boolean;
    bot: boolean;
    discoverable?: boolean;
    group: boolean;
    created_at: string;
    note: string;
    url: string;
    avatar: string;
    avatar_static: string;
    header: string;
    header_static: string;
    followers_count: number;
    following_count: number;
    statuses_count: number;
    emojis: Emoji[];
    fields: Field[];
};
