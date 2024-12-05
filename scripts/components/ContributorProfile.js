import React, { useState } from 'react';

const StatusDot = ({ status }) => {
  const colors = {
    open: 'bg-green-500',
    closed: 'bg-red-500',
    merged: 'bg-purple-500'
  };

  return React.createElement('span', {
    className: `inline-block w-2 h-2 rounded-full ${colors[status]} mr-2`
  });
};

const ActivitySection = ({ title, items = [], showStatus = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getStatus = (item) => {
    if (item.state === 'merged' || (item.state === 'closed' && title === 'Pull Requests')) {
      return 'merged';
    }
    return item.state || 'open';
  };

  return React.createElement('div', { className: 'border rounded-lg p-4' },
    React.createElement('div', {
      className: 'flex items-center justify-between cursor-pointer',
      onClick: () => setIsExpanded(!isExpanded)
    },
      React.createElement('h3', { className: 'font-semibold' }, title),
      React.createElement('span', null, isExpanded ? '▼' : '▶')
    ),
    isExpanded && React.createElement('div', { className: 'mt-4 space-y-2' },
      items.map((item, index) => 
        React.createElement('div', { key: index, className: 'p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded' },
          React.createElement('a', {
            href: item.url,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'text-sm hover:text-blue-500 flex flex-col gap-1'
          },
            React.createElement('span', { className: 'font-medium flex items-center' },
              showStatus && React.createElement(StatusDot, { status: getStatus(item) }),
              item.message || item.title || item.body
            ),
            React.createElement('span', { className: 'text-gray-500 text-xs' },
              new Date(item.date || item.created_at).toLocaleDateString()
            )
          )
        )
      )
    )
  );
};

const StatCard = ({ name, value, score = null }) => {
  return React.createElement('div', { className: 'bg-white dark:bg-gray-800 rounded-lg p-6 shadow relative' },
    score !== null && React.createElement('div', { 
      className: 'absolute top-2 right-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold px-2 py-1 rounded'
    }, `Score: ${score}`),
    React.createElement('h3', { className: 'font-semibold' }, name),
    React.createElement('p', { className: 'text-2xl font-bold' }, value)
  );
};

const ContributorProfile = ({ data }) => {
  const stats = [
    { name: 'Commits', value: data.activity.code.total_commits },
    { name: 'Pull Requests', value: data.activity.code.total_prs },
    { name: 'Issues', value: data.activity.issues.total_opened },
    { name: 'Comments', value: data.activity.engagement.total_comments }
  ];

  return React.createElement('div', { className: 'max-w-7xl mx-auto p-4 space-y-6' },
    React.createElement('div', { className: 'bg-white dark:bg-gray-800 rounded-lg p-6 shadow' },
      React.createElement('div', { className: 'flex items-center justify-between' },
        React.createElement('div', { className: 'flex items-center gap-4' },
          React.createElement('img', {
            src: data.avatar_url,
            alt: `${data.username}'s avatar`,
            className: 'w-16 h-16 rounded-full'
          }),
          React.createElement('div', null,
            React.createElement('h1', { className: 'text-2xl font-bold' }, data.username),
            React.createElement('p', { className: 'text-gray-600 dark:text-gray-400' },
              `${data.total_contributions} total contributions`
            )
          )
        ),
        data.contribution_scores?.total && React.createElement('div', {
          className: 'text-3xl font-bold text-blue-600 dark:text-blue-400'
        }, data.contribution_scores.total)
      )
    ),

    data.contribution_summary && React.createElement('div', { 
      className: 'bg-white dark:bg-gray-800 rounded-lg p-6 shadow'
    },
      React.createElement('p', { 
        className: 'text-gray-700 dark:text-gray-300 text-sm leading-relaxed'
      }, data.contribution_summary)
    ),

    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-4' },
      stats.map(stat => React.createElement(StatCard, { 
        key: stat.name,
        ...stat
      }))
    ),

    React.createElement('div', { className: 'space-y-4' },
      React.createElement(ActivitySection, {
        title: 'Commits',
        items: data.activity.code.commits
      }),
      React.createElement(ActivitySection, {
        title: 'Pull Requests',
        items: data.activity.code.pull_requests,
        showStatus: true
      }),
      React.createElement(ActivitySection, {
        title: 'Issues',
        items: data.activity.issues.opened || [],
        showStatus: true
      }),
      React.createElement(ActivitySection, {
        title: 'Comments',
        items: [
          ...(data.activity.engagement.issue_comments || []),
          ...(data.activity.engagement.pr_comments || [])
        ]
      })
    )
  );
};

export default ContributorProfile;
