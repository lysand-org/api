import type { StatusVisibility } from "./status.ts";

export type Preferences = {
    "posting:default:visibility": StatusVisibility;
    "posting:default:sensitive": boolean;
    "posting:default:language": string | null;
    "reading:expand:media": "default" | "show_all" | "hide_all";
    "reading:expand:spoilers": boolean;
};
