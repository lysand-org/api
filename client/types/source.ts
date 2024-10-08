import type { Field } from "./field.ts";

export type Source = {
    privacy: string | null;
    sensitive: boolean | null;
    language: string | null;
    note: string;
    fields: Field[];
};
