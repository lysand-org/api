import { z } from "zod";
import { ContentFormat } from "./content_format";
import { CustomEmojiExtension } from "./extensions/custom_emojis";
import { VanityExtension } from "./extensions/vanity";
import { extensionTypeRegex } from "./regex";

const Entity = z.object({
    id: z.string().uuid(),
    created_at: z.string(),
    uri: z.string().url(),
    type: z.string(),
    extensions: z.object({
        "org.lysand:custom_emojis": CustomEmojiExtension.optional(),
    }),
});

const Visibility = z.enum(["public", "unlisted", "private", "direct"]);

const Publication = Entity.extend({
    type: z.enum(["Note", "Patch"]),
    author: z.string().url(),
    content: ContentFormat.optional(),
    attachments: z.array(ContentFormat).optional(),
    replies_to: z.string().url().optional(),
    quotes: z.string().url().optional(),
    mentions: z.array(z.string().url()).optional(),
    subject: z.string().optional(),
    is_sensitive: z.boolean().optional(),
    visibility: Visibility,
    extensions: Entity.shape.extensions.extend({
        "org.lysand:reactions": z
            .object({
                reactions: z.string(),
            })
            .optional(),
        "org.lysand:polls": z
            .object({
                poll: z.object({
                    options: z.array(ContentFormat),
                    votes: z.array(z.number().int().nonnegative()),
                    multiple_choice: z.boolean().optional(),
                    expires_at: z.string(),
                }),
            })
            .optional(),
    }),
});

const Note = Publication.extend({
    type: z.literal("Note"),
});

const Patch = Publication.extend({
    type: z.literal("Patch"),
    patched_id: z.string().uuid(),
    patched_at: z.string(),
});

const ActorPublicKeyData = z.object({
    public_key: z.string(),
    actor: z.string().url(),
});

const User = Entity.extend({
    type: z.literal("User"),
    display_name: z.string().optional(),
    username: z.string(),
    avatar: ContentFormat.optional(),
    header: ContentFormat.optional(),
    indexable: z.boolean(),
    public_key: ActorPublicKeyData,
    bio: ContentFormat.optional(),
    fields: z
        .array(
            z.object({
                name: ContentFormat,
                value: ContentFormat,
            }),
        )
        .optional(),
    featured: z.string().url(),
    followers: z.string().url(),
    following: z.string().url(),
    likes: z.string().url(),
    dislikes: z.string().url(),
    inbox: z.string().url(),
    outbox: z.string().url(),
    extensions: Entity.shape.extensions.extend({
        "org.lysand:vanity": VanityExtension.optional(),
    }),
});

const Action = Entity.extend({
    type: z.union([
        z.literal("Like"),
        z.literal("Dislike"),
        z.literal("Follow"),
        z.literal("FollowAccept"),
        z.literal("FollowReject"),
        z.literal("Announce"),
        z.literal("Undo"),
    ]),
    author: z.string().url(),
});

const Like = Action.extend({
    type: z.literal("Like"),
    object: z.string().url(),
});

const Undo = Action.extend({
    type: z.literal("Undo"),
    object: z.string().url(),
});

const Dislike = Action.extend({
    type: z.literal("Dislike"),
    object: z.string().url(),
});

const Follow = Action.extend({
    type: z.literal("Follow"),
    followee: z.string().url(),
});

const FollowAccept = Action.extend({
    type: z.literal("FollowAccept"),
    follower: z.string().url(),
});

const FollowReject = Action.extend({
    type: z.literal("FollowReject"),
    follower: z.string().url(),
});

const Extension = Entity.extend({
    type: z.literal("Extension"),
    extension_type: z
        .string()
        .regex(
            extensionTypeRegex,
            "extension_type must be in the format 'namespaced_url:extension_name/ExtensionType', e.g. 'org.lysand:reactions/Reaction'. Notably, only the type can have uppercase letters.",
        ),
});

const Report = Extension.extend({
    extension_type: z.literal("org.lysand:reports/Report"),
    objects: z.array(z.string().url()),
    reason: z.string(),
    comment: z.string().optional(),
});

const ServerMetadata = Entity.extend({
    type: z.literal("ServerMetadata"),
    name: z.string(),
    version: z.string(),
    description: z.string().optional(),
    website: z.string().optional(),
    moderators: z.array(z.string()).optional(),
    admins: z.array(z.string()).optional(),
    logo: ContentFormat.optional(),
    banner: ContentFormat.optional(),
    supported_extensions: z.array(z.string()),
    extensions: z.record(z.string(), z.any()).optional(),
});

export {
    Entity,
    Visibility,
    Publication,
    Note,
    Patch,
    ActorPublicKeyData,
    VanityExtension,
    User,
    Action,
    Like,
    Undo,
    Dislike,
    Follow,
    FollowAccept,
    FollowReject,
    Extension,
    Report,
    ServerMetadata,
    ContentFormat,
    CustomEmojiExtension,
};
