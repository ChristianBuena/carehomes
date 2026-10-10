/**
 * What a server action returns to the client.
 *
 * Server actions must RETURN user-facing errors, never throw them: in a
 * production build Next.js replaces the message of any error thrown by a
 * server action with a generic one, so a thrown message is only readable in
 * development.
 */
export type ActionResult = { success: true } | { success: false; error: string };
