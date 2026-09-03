/**
 * Jira integration — deep-link only, "best effort".
 *
 * Jira Cloud's REST API does not send CORS headers for ad-hoc basic-auth
 * requests made directly from a browser (only Forge/Connect apps running
 * inside Jira, or a server-side OAuth 2.0 exchange, are supported). Since VOV
 * has no backend, we can't call the Jira API from here — so instead of a real
 * integration, this opens Jira's own "create issue" screen and copies the
 * quest's title/description to the clipboard so the user can paste them in.
 *
 * There is no way to read back a status from Jira without an API call, so
 * Jira linked items never get a "status" or "Refresh" button — see
 * LinkedItem.status in types/index.ts.
 */

function stripTrailingSlash(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

/** Opens the generic "create issue" screen for the given Jira site. */
export function buildJiraCreateLink(siteUrl: string): string {
  return `${stripTrailingSlash(siteUrl)}/secure/CreateIssue.jspa`
}

/** Best-effort "browse issue" link from a site + issue key like "PROJ-123". */
export function buildJiraBrowseLink(siteUrl: string, issueKey: string): string {
  return `${stripTrailingSlash(siteUrl)}/browse/${issueKey.trim()}`
}

/** True if the string looks like a full Jira issue URL rather than a bare key. */
export function isJiraUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

/** Extracts "PROJ-123" from either a bare key or a full browse URL. */
export function extractJiraKey(value: string): string {
  const trimmed = value.trim()
  const match = trimmed.match(/([A-Z][A-Z0-9]+-\d+)/i)
  return match ? match[1].toUpperCase() : trimmed
}

export function formatQuestSummaryForClipboard(title: string, description: string): string {
  return description ? `${title}\n\n${description}` : title
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}
