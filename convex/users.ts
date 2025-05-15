import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertFromClerk = internalMutation({
  args: {
    data: v.any(), // This will be the full Clerk user object
  },
  handler: async (ctx, args) => {
    const user = args.data;

    console.log("🆔 Clerk User ID:", user.id);
    console.log("📧 Email:", user.email_addresses[0]?.email_address);
    const existing = await ctx.db
      .query("users")
      .filter((q) =>
        q.or(
          q.eq(q.field("clerkId"), user.id),
          q.eq(q.field("email"), user.email_addresses[0]?.email_address ?? "")
        )
      )
      .first();

    if (existing) {
      console.log("✅ User already exists:", existing._id);
      return;
    }

    console.log("➕ Inserting user", user.id);

    return await ctx.db.insert("users", {
      clerkId: user.id,
      name: user.first_name + " " + user.last_name,
      email: user.email_addresses[0]?.email_address ?? "",
      image: user.image_url,
      createdAt: new Date().toISOString(),
    });
  },
});

export const updateUser = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!existingUser) return;

    return await ctx.db.patch(existingUser._id, args);
  },
});
