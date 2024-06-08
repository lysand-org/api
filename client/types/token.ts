/**
 * Mastodon API Access Token
 */
export type Token = {
    access_token: string;
    token_type: string;
    scope: string;
    created_at: number;
};
