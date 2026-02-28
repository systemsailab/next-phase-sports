import { auth, currentUser } from "@clerk/nextjs/server";

export type UserRole = "owner" | "admin" | "staff" | "coach" | "customer";

/**
 * Get current user with role from Clerk public metadata.
 */
export async function getCurrentUser() {
  const user = await currentUser();
  if (!user) return null;

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.emailAddresses[0]?.emailAddress ?? "",
    role: (user.publicMetadata?.role as UserRole) ?? "customer",
    orgId: user.publicMetadata?.facilityId as string | undefined,
  };
}

/**
 * Require auth — redirect to sign-in if not authenticated.
 */
export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

/**
 * Check if current user has admin access (owner or admin role).
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (user.role !== "owner" && user.role !== "admin") {
    throw new Error("Forbidden: Admin access required");
  }
  return user;
}
