import { Suspense } from "react";
import {
  RepositoryList,
  RepositoryListFallback,
} from "./components/RepositoryList";

export default async function ReposPage() {
  return (
    <main className="container mx-auto space-y-8 p-4">
      <Suspense fallback={<RepositoryListFallback />}>
        <RepositoryList />
      </Suspense>
    </main>
  );
}
