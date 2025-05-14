// Defines the types used by the GitHub API service.
// These might be moved to a central types file later if they grow in complexity or are used elsewhere.

export interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name?: string | null; // Marked as optional as per previous findings
  company?: string | null;
  blog?: string | null;
  location?: string | null;
  email?: string | null; // Marked as optional
  hireable?: boolean | null;
  bio?: string | null;
  twitter_username?: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  private_gists?: number;
  total_private_repos?: number;
  owned_private_repos?: number;
  disk_usage?: number;
  collaborators?: number;
  two_factor_authentication?: boolean;
  plan?: {
    name: string;
    space: number;
    collaborators: number;
    private_repos: number;
  };
}

export interface GitHubRepoOwner {
  login: string;
  id: number;
  // Add other owner fields if needed
}

export interface GitHubRepo {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: GitHubRepoOwner;
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  // Add other repo fields as necessary
  default_branch: string; // useful for README operations
}

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: "file" | "dir" | "symlink" | "submodule";
  content: string; // Base64 encoded content
  encoding: "base64";
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

export interface UpdateFileResponse {
  content: {
    name: string;
    path: string;
    sha: string;
    // ... other fields from GitHubFileContent
  };
  commit: {
    sha: string;
    message: string;
    // ... other commit fields
  };
}

const GITHUB_API_BASE_URL = "https://api.github.com";

async function makeGitHubApiRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${GITHUB_API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    console.error("GitHub API Error:", response.status, errorBody);
    throw new Error(
      `GitHub API request failed: ${response.status} ${response.statusText}. ${errorBody.message || ""}`,
    );
  }
  // For 204 No Content, response.json() will fail.
  if (response.status === 204) {
    return null as T; // Or handle as appropriate for the specific call
  }
  return response.json() as Promise<T>;
}

export async function getAuthenticatedUser(token: string): Promise<GitHubUser> {
  return makeGitHubApiRequest<GitHubUser>("/user", token);
}

export async function getRepo(
  token: string,
  owner: string,
  repoName: string,
): Promise<GitHubRepo> {
  return makeGitHubApiRequest<GitHubRepo>(`/repos/${owner}/${repoName}`, token);
}

export async function createRepo(
  token: string,
  repoName: string,
  description: string,
  autoInit: boolean = true,
): Promise<GitHubRepo> {
  return makeGitHubApiRequest<GitHubRepo>("/user/repos", token, {
    method: "POST",
    body: JSON.stringify({
      name: repoName,
      description: description,
      auto_init: autoInit, // Creates an initial commit with an empty README.
      private: false, // Assuming profile repo should be public
    }),
  });
}

export async function getFileContent(
  token: string,
  owner: string,
  repoName: string,
  filePath: string,
): Promise<GitHubFileContent | null> {
  try {
    return await makeGitHubApiRequest<GitHubFileContent>(
      `/repos/${owner}/${repoName}/contents/${filePath}`,
      token,
    );
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message &&
      error.message.includes("404")
    ) {
      return null; // File not found
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string" &&
      (error as { message: string }).message.includes("404")
    ) {
      return null; // File not found
    }
    throw error; // Re-throw other errors
  }
}

export async function updateFile(
  token: string,
  owner: string,
  repoName: string,
  filePath: string,
  message: string,
  content: string, // Plain text content
  sha?: string,
): Promise<UpdateFileResponse> {
  // const encodedContent = Buffer.from(content).toString("base64"); // Use Buffer for btoa in Node.js environment
  // To handle potential Unicode characters correctly with btoa, first encode to UTF-8
  const utf8Bytes = new TextEncoder().encode(content);
  const binaryString = String.fromCharCode(...Array.from(utf8Bytes));
  const encodedContent = btoa(binaryString);

  const body: { message: string; content: string; sha?: string } = {
    message,
    content: encodedContent,
  };

  if (sha) {
    body.sha = sha;
  }

  return makeGitHubApiRequest<UpdateFileResponse>(
    `/repos/${owner}/${repoName}/contents/${filePath}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}
