import { NextPage } from 'next';

const AboutPage: NextPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">About ElizaOS</h1>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 text-gray-800 border-b-2 border-gray-200 pb-2">Purpose</h2>
        <p className="text-lg text-gray-700 mb-4 leading-relaxed">
          Eliza Leaderboard is a modern analytics pipeline for tracking and analyzing GitHub contributions. 
          The system processes contributor data, generates AI-powered summaries, and maintains a leaderboard 
          of developer activity.
        </p>
        <p className="text-lg text-gray-700 mb-4 leading-relaxed">
          Our mission is to develop an extensible, modular, open-source AI agent framework that thrives 
          across both Web2 and Web3 ecosystems. We see AI agents as the key stepping stones toward AGI, 
          enabling increasingly autonomous and capable systems.
        </p>
        <div className="mt-6 p-6 bg-gray-50 rounded-lg shadow">
          <h3 className="text-2xl font-semibold mb-3 text-gray-700">Core Philosophy</h3>
          <ul className="list-disc list-inside text-lg text-gray-700 space-y-2">
            <li>
              <span className="font-semibold">Autonomy & Adaptability:</span> Agents should learn, reason, and adapt across diverse tasks without human intervention.
            </li>
            <li>
              <span className="font-semibold">Modularity & Composability:</span> AI architectures should be modular, allowing for iterative improvements and robust scalability.
            </li>
            <li>
              <span className="font-semibold">Decentralization & Open Collaboration:</span> AI systems should move beyond centralized control towards distributed intelligence and community-driven progress.
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-semibold mb-6 text-gray-800 border-b-2 border-gray-200 pb-2">How it Works</h2>
        <p className="text-lg text-gray-700 mb-4 leading-relaxed">
          The project uses GitHub Actions for automated data processing, summary generation, and deployment. 
          The system maintains separate branches for code and data to optimize Git history management.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
            <h3 className="text-2xl font-semibold mb-3 text-blue-600">GitHub Actions Workflows</h3>
            <ul className="list-disc list-inside text-lg text-gray-700 space-y-2">
              <li>
                <span className="font-semibold">Run Pipelines (`run-pipelines.yml`):</span> Runs daily to fetch GitHub data, process it, and generate summaries. It maintains data in a dedicated <code>_data</code> branch and can be manually triggered.
              </li>
              <li>
                <span className="font-semibold">Deploy to GitHub Pages (`deploy.yml`):</span> Builds and deploys the site, triggered on pushes to main, manually, or after successful pipeline runs.
              </li>
              <li>
                <span className="font-semibold">PR Checks (`pr-checks.yml`):</span> Ensures quality for pull requests by running linting, typechecking, build verification, and pipeline tests on sample data.
              </li>
            </ul>
          </div>

          <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
            <h3 className="text-2xl font-semibold mb-3 text-green-600">Data Management Architecture</h3>
            <ul className="list-disc list-inside text-lg text-gray-700 space-y-2">
              <li>
                <span className="font-semibold">Separate Data Branch:</span> All pipeline data is stored in a separate branch (e.g., <code>_data</code>) to keep the main branch clean and focused on code.
              </li>
              <li>
                <span className="font-semibold">Database Serialization:</span> Uses <code>sqlite-diffable</code> to store database content as version-controlled text files, enabling efficient tracking of database changes.
              </li>
              <li>
                <span className="font-semibold">Custom GitHub Actions:</span> Utilizes <code>restore-db</code> and <code>pipeline-data</code> actions to manage data retrieval and updates in the data branch.
              </li>
            </ul>
          </div>
        </div>
        
        <p className="text-lg text-gray-700 mb-4 leading-relaxed">
          This architecture ensures efficient Git history management, reliable CI/CD workflows with consistent data access, 
          simplified deployment with automatic data restoration, and effective collaboration without data conflict issues.
        </p>

        <div className="mt-8 p-6 bg-indigo-50 rounded-lg shadow">
           <h3 className="text-2xl font-semibold mb-4 text-indigo-700">Pipeline Commands</h3>
           <p className="text-lg text-gray-700 mb-4">The main pipelines and their usages can be explored with the following commands:</p>
           <div className="space-y-2">
            <code className="block bg-gray-800 text-white p-3 rounded-md text-sm">bun run pipeline ingest -h</code>
            <code className="block bg-gray-800 text-white p-3 rounded-md text-sm">bun run pipeline process -h</code>
            <code className="block bg-gray-800 text-white p-3 rounded-md text-sm">bun run pipeline export -h</code>
            <code className="block bg-gray-800 text-white p-3 rounded-md text-sm">bun run pipeline summarize -h</code>
           </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
