import React, { useState } from 'react';

const GithubIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
  </svg>
);

const StatusDot = ({ status }) => {
  const colors = {
    open: 'bg-green-500',
    closed: 'bg-red-500',
    merged: 'bg-purple-500'
  };

  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status]} mr-2`} />
  );
};

const ActivitySection = ({ title, items = [], showStatus = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getStatus = (item) => {
    if (item.state === 'merged' || (item.state === 'closed' && title === 'Pull Requests')) {
      return 'merged';
    }
    return item.state || 'open';
  };

  return (
    <div className="border rounded-lg p-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-semibold">{title}</h3>
        <span>{isExpanded ? '▼' : '▶'}</span>
      </div>
      {isExpanded && (
        <div className="mt-4 space-y-2">
          {items.map((item, index) => (
            <div 
              key={index} 
              className="p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition duration-150"
            >
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:text-blue-500 flex flex-col gap-1 group"
              >
                <span className="font-medium flex items-center justify-between">
                  <span className="flex items-center">
                    {showStatus && <StatusDot status={getStatus(item)} />}
                    {item.message || item.title || item.body}
                  </span>
                  <GithubIcon className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <span className="text-gray-500 text-xs flex items-center justify-between">
                  <span>{new Date(item.date || item.created_at).toLocaleDateString()}</span>
                  <span className="text-gray-400">View on GitHub →</span>
                </span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ name, value, onClick }) => (
  <div 
    className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition-shadow duration-200 cursor-pointer"
    onClick={onClick}
  >
    <h3 className="font-semibold text-gray-600 dark:text-gray-400">{name}</h3>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

const ContributorProfile = ({ data }) => {
  const githubProfileUrl = `https://github.com/${data.contributor}`;
  const stats = [
    { 
      name: 'Commits', 
      value: data.activity.code.total_commits,
      url: `${githubProfileUrl}?tab=repositories`
    },
    { 
      name: 'Pull Requests', 
      value: data.activity.code.total_prs,
      url: `${githubProfileUrl}?tab=pull-requests`
    },
    { 
      name: 'Issues', 
      value: data.activity.issues.total_opened,
      url: `${githubProfileUrl}?tab=issues`
    },
    { 
      name: 'Comments', 
      value: data.activity.engagement.total_comments,
      url: `${githubProfileUrl}?tab=discussions`
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header with avatar and basic info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a 
              href={githubProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative"
            >
              <img
                src={data.avatar_url}
                alt={`${data.contributor}'s avatar`}
                className="w-16 h-16 rounded-full ring-2 ring-transparent group-hover:ring-blue-500 transition-all duration-200"
              />
              <GithubIcon className="absolute bottom-0 right-0 text-gray-700 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            <div>
              <a 
                href={githubProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 group"
              >
                <h1 className="text-2xl font-bold group-hover:text-blue-500 transition-colors">{data.contributor}</h1>
                <GithubIcon className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <div className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Contribution Score: </span>
                {data.score}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contribution Summary */}
      {data.summary && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {data.summary}
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <StatCard 
            key={stat.name} 
            {...stat} 
            onClick={() => window.open(stat.url, '_blank')}
          />
        ))}
      </div>

      {/* Activity Sections */}
      <div className="space-y-4">
        <ActivitySection
          title="Commits"
          items={data.activity.code.commits}
        />
        <ActivitySection
          title="Pull Requests"
          items={data.activity.code.pull_requests}
          showStatus={true}
        />
        <ActivitySection
          title="Issues"
          items={data.activity.issues.opened || []}
          showStatus={true}
        />
        <ActivitySection
          title="Comments"
          items={data.activity.engagement.comments}
        />
      </div>
    </div>
  );
};

export default ContributorProfile;