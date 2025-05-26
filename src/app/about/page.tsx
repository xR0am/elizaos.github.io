import { NextPage } from "next";

const AboutPage: NextPage = () => {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <article className="prose prose-lg max-w-none dark:prose-invert">
        <h1 className="text-center">About</h1>

        <section>
          <h2>Vision: Open Source as The Great Online Game</h2>
          <p>
            We&apos;re building the reputation layer for open source
            development. Inspired by RuneScape&apos;s skill system, every commit
            earns XP, every review levels up your skills, and your contributions
            become your permanent digital identity.
          </p>
        </section>

        <section>
          <h2>The Problem</h2>
          <p>
            Open source creates extraordinary value -{" "}
            <a
              href="https://www.hbs.edu/ris/Publication%20Files/24-038_51f8444f-502c-4139-8bf2-56eb4b65c58a.pdf#page=31.22"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Harvard research shows $1 invested in OSS generates $2,000 of
              value
            </a>{" "}
            for companies, totaling $8.8 trillion. Yet contributors remain
            invisible:
          </p>
          <ul>
            <li>
              Massive value, minimal compensation - OSS supports core
              infrastructure across industries, yet the vast majority of
              maintainers receive little to no financial support
            </li>
            <li>
              Critical context scattered across GitHub, Discord, Twitter -
              impossible to track
            </li>
            <li>
              Difficult to see who actually knows what in massive projects
            </li>
            <li>
              No standardized or portable reputation system - Contributors build
              value across projects, but recognition is siloed with no way to
              track long-term impact
            </li>
          </ul>
        </section>

        <section>
          <h2>Our Solution</h2>
          <p>
            A powerful analytics pipeline that transforms GitHub activity into
            living developer profiles. Inspired by MMORPG progression systems,
            we track expertise across three dimensions:
          </p>

          <div className="mb-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-3 text-xl font-semibold text-blue-600 dark:text-blue-400">
                Roles
              </h3>
              <p className="text-muted-foreground">
                What type of contributor you are (maintainer, architect, feature
                developer)
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-3 text-xl font-semibold text-green-600 dark:text-green-400">
                Focus Areas
              </h3>
              <p className="text-muted-foreground">
                Which parts of the codebase you work on (docs, core, UI,
                infrastructure)
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-3 text-xl font-semibold text-purple-600 dark:text-purple-400">
                Skills
              </h3>
              <p className="text-muted-foreground">
                The technologies you demonstrate proficiency in (TypeScript,
                APIs, databases)
              </p>
            </div>
          </div>

          <p>
            Every merged PR containing documentation changes increases your docs
            XP. Work on core architecture? Your architect role levels up. The
            more you contribute to specific areas, the higher your expertise
            becomes - making it clear who knows what in any project.
          </p>
        </section>

        <section>
          <h2>The Tech Stack</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></span>
                <div>
                  <span className="font-semibold text-foreground">
                    Data Pipeline:
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    Automated GitHub ingestion processing thousands of events
                    daily
                  </span>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></span>
                <div>
                  <span className="font-semibold text-foreground">
                    AI Intelligence:
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    OpenRouter-powered summaries surfacing signal from noise
                  </span>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></span>
                <div>
                  <span className="font-semibold text-foreground">
                    Scoring Engine:
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    RuneScape-inspired XP calculations tracking expertise across
                    codebases
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></span>
                <div>
                  <span className="font-semibold text-foreground">
                    Storage:
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    SQLite database with version-controlled diffable dumps
                  </span>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></span>
                <div>
                  <span className="font-semibold text-foreground">
                    Deployment:
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    GitHub Actions → Static Site with lightning-fast performance
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p className="font-medium">
            The entire system is open source, from ingestion to visualization.
          </p>
        </section>

        <section>
          <h2>Roadmap to the Meritverse</h2>
          <div className="space-y-6">
            <div className="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-950">
              <div className="mb-3 flex items-center">
                <span className="mr-3 text-2xl">✅</span>
                <h3 className="text-xl font-semibold text-green-800 dark:text-green-200">
                  Phase 1: Foundation
                </h3>
              </div>
              <ul className="space-y-2 text-green-700 dark:text-green-300">
                <li>• GitHub data processing with skill progression</li>
                <li>• AI-powered daily/weekly/monthly summaries</li>
                <li>• Contributor profiles showing expertise levels</li>
              </ul>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950">
              <div className="mb-3 flex items-center">
                <span className="mr-3 text-2xl">🔄</span>
                <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200">
                  Phase 2: Identity
                </h3>
              </div>
              <ul className="space-y-2 text-blue-700 dark:text-blue-300">
                <li>• GitHub OAuth for user authentication</li>
                <li>• Wallet linking (ETH/SOL) bridging Web2/Web3</li>
                <li>• Public API for reputation queries</li>
              </ul>
            </div>

            <div className="rounded-lg border border-orange-200 bg-orange-50 p-6 dark:border-orange-800 dark:bg-orange-950">
              <div className="mb-3 flex items-center">
                <span className="mr-3 text-2xl">📋</span>
                <h3 className="text-xl font-semibold text-orange-800 dark:text-orange-200">
                  Phase 3: Achievements
                </h3>
              </div>
              <ul className="space-y-2 text-orange-700 dark:text-orange-300">
                <li>
                  • Character Studio integration - unlock 3D wearables based on
                  your skill levels
                </li>
                <li>
                  • Achievement NFTs for reaching milestones (Level 99
                  TypeScript!)
                </li>
                <li>• Cross-platform reputation portability</li>
              </ul>
            </div>

            <div className="rounded-lg border border-purple-200 bg-purple-50 p-6 dark:border-purple-800 dark:bg-purple-950">
              <div className="mb-3 flex items-center">
                <span className="mr-3 text-2xl">🚀</span>
                <h3 className="text-xl font-semibold text-purple-800 dark:text-purple-200">
                  Phase 4: The Great Online Game
                </h3>
              </div>
              <ul className="space-y-2 text-purple-700 dark:text-purple-300">
                <li>• Quest systems for coordinated development</li>
                <li>• Guild formation around shared expertise</li>
                <li>• Internet-scale achievement system</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2>Why This Matters</h2>
          <p>
            Open source contributors generate thousands of dollars in value for
            every dollar invested, yet receive almost nothing in return.
            We&apos;re changing that by creating digital status symbols that
            can&apos;t be bought, only earned. Your profile becomes your
            developer resume, your reputation proof, and your achievement
            showcase - all generated from actual contributions.
          </p>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-8 text-center">
            <h3 className="mb-4 text-2xl font-bold text-primary">
              Ready to see your true level?
            </h3>
            <div className="space-y-3">
              <div>
                <span className="font-semibold text-foreground">Explore:</span>{" "}
                <a
                  href="https://elizaos.github.io"
                  className="font-mono text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  elizaos.github.io
                </a>
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  Contribute:
                </span>{" "}
                <a
                  href="https://github.com/elizaos/eliza"
                  className="font-mono text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  github.com/elizaos/eliza
                </a>
              </div>
            </div>
            <p className="mt-6 text-lg font-medium italic text-foreground">
              The game has already begun. Time to claim your place on the
              leaderboard.
            </p>
          </div>
        </section>
      </article>
    </div>
  );
};

export default AboutPage;
