import { getRepositories, Repository } from "../queries";
import { RepositoryCard } from "./RepositoryCard";

export async function RepositoryList() {
  const repositories = await getRepositories();

  return (
    <div className="space-y-4">
      {repositories.map((repo) => (
        <RepositoryCard key={repo.id} repository={repo} />
      ))}
    </div>
  );
}

export function RepositoryListFallback() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-lg border bg-muted"
        />
      ))}
    </div>
  );
}
