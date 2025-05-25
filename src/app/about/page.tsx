import { NextPage } from "next";

const AboutPage: NextPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-center text-4xl font-bold">About ElizaOS</h1>

      <section className="mb-12">
        <h2 className="mb-6 border-b-2 border-border pb-2 text-3xl font-semibold text-foreground">
          Purpose
        </h2>
        <p className="mb-4 text-lg leading-relaxed text-muted-foreground">
          Eliza Leaderboard is a modern analytics pipeline for tracking and
          analyzing GitHub contributions. The system processes contributor data,
          generates AI-powered summaries, and maintains a leaderboard of
          developer activity.
        </p>
        <p className="mb-4 text-lg leading-relaxed text-muted-foreground">
          Our mission is to develop an extensible, modular, open-source AI agent
          framework that thrives across both Web2 and Web3 ecosystems. We see AI
          agents as the key stepping stones toward AGI, enabling increasingly
          autonomous and capable systems.
        </p>
        <div className="mt-6 rounded-lg bg-muted p-6 shadow">
          <h3 className="mb-3 text-2xl font-semibold text-foreground">
            Core Philosophy
          </h3>
          <ul className="list-inside list-disc space-y-2 text-lg text-muted-foreground">
            <li>
              <span className="font-semibold text-foreground">
                Autonomy & Adaptability:
              </span>{" "}
              Agents should learn, reason, and adapt across diverse tasks
              without human intervention.
            </li>
            <li>
              <span className="font-semibold text-foreground">
                Modularity & Composability:
              </span>{" "}
              AI architectures should be modular, allowing for iterative
              improvements and robust scalability.
            </li>
            <li>
              <span className="font-semibold text-foreground">
                Decentralization & Open Collaboration:
              </span>{" "}
              AI systems should move beyond centralized control towards
              distributed intelligence and community-driven progress.
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="mb-6 border-b-2 border-border pb-2 text-3xl font-semibold text-foreground">
          How it Works
        </h2>
        <p className="mb-4 text-lg leading-relaxed text-muted-foreground">
          The project uses GitHub Actions for automated data processing, summary
          generation, and deployment. The system maintains separate branches for
          code and data to optimize Git history management.
        </p>

        <div className="mb-8 grid gap-8 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6 shadow-md">
            <h3 className="mb-3 text-2xl font-semibold text-blue-600 dark:text-blue-400">
              GitHub Actions Workflows
            </h3>
            <ul className="list-inside list-disc space-y-2 text-lg text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">
                  Run Pipelines (`run-pipelines.yml`):
                </span>{" "}
                Runs daily to fetch GitHub data, process it, and generate
                summaries. It maintains data in a dedicated{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-sm">
                  _data
                </code>{" "}
                branch and can be manually triggered.
              </li>
              <li>
                <span className="font-semibold text-foreground">
                  Deploy to GitHub Pages (`deploy.yml`):
                </span>{" "}
                Builds and deploys the site, triggered on pushes to main,
                manually, or after successful pipeline runs.
              </li>
              <li>
                <span className="font-semibold text-foreground">
                  PR Checks (`pr-checks.yml`):
                </span>{" "}
                Ensures quality for pull requests by running linting,
                typechecking, build verification, and pipeline tests on sample
                data.
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-md">
            <h3 className="mb-3 text-2xl font-semibold text-green-600 dark:text-green-400">
              Data Management Architecture
            </h3>
            <ul className="list-inside list-disc space-y-2 text-lg text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">
                  Separate Data Branch:
                </span>{" "}
                All pipeline data is stored in a separate branch (e.g.,{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-sm">
                  _data
                </code>
                ) to keep the main branch clean and focused on code.
              </li>
              <li>
                <span className="font-semibold text-foreground">
                  Database Serialization:
                </span>{" "}
                Uses{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-sm">
                  sqlite-diffable
                </code>{" "}
                to store database content as version-controlled text files,
                enabling efficient tracking of database changes.
              </li>
              <li>
                <span className="font-semibold text-foreground">
                  Custom GitHub Actions:
                </span>{" "}
                Utilizes{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-sm">
                  restore-db
                </code>{" "}
                and{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-sm">
                  pipeline-data
                </code>{" "}
                actions to manage data retrieval and updates in the data branch.
              </li>
            </ul>
          </div>
        </div>

        <p className="mb-4 text-lg leading-relaxed text-muted-foreground">
          This architecture ensures efficient Git history management, reliable
          CI/CD workflows with consistent data access, simplified deployment
          with automatic data restoration, and effective collaboration without
          data conflict issues.
        </p>

        <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-6 shadow">
          <h3 className="mb-4 text-2xl font-semibold text-primary">
            Pipeline Commands
          </h3>
          <p className="mb-4 text-lg text-muted-foreground">
            The main pipelines and their usages can be explored with the
            following commands:
          </p>
          <div className="space-y-2">
            <code className="block rounded-md bg-secondary p-3 font-mono text-sm text-secondary-foreground">
              bun run pipeline ingest -h
            </code>
            <code className="block rounded-md bg-secondary p-3 font-mono text-sm text-secondary-foreground">
              bun run pipeline process -h
            </code>
            <code className="block rounded-md bg-secondary p-3 font-mono text-sm text-secondary-foreground">
              bun run pipeline export -h
            </code>
            <code className="block rounded-md bg-secondary p-3 font-mono text-sm text-secondary-foreground">
              bun run pipeline summarize -h
            </code>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
