import React, { useState } from 'react';

const ActivitySection = ({ title, items = [], color = 'text-blue-500' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return React.createElement('div', { className: 'border rounded-lg p-4' },
    React.createElement('div', {
      className: 'flex items-center justify-between cursor-pointer',
      onClick: toggleExpand
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
            React.createElement('span', { className: 'font-medium' }, 
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

const StatCard = ({ name, value }) => {
  return React.createElement('div', { className: 'bg-white dark:bg-gray-800 rounded-lg p-6 shadow' },
    React.createElement('h3', { className: 'font-semibold' }, name),
    React.createElement('p', { className: 'text-2xl font-bold' }, value)
  );
};

const ContributorProfile = ({ data }) => {
  const stats = [
    { name: 'Commits', value: data.activity.code.total_commits },
    { name: 'PRs', value: data.activity.code.total_prs },
    { name: 'Issues', value: data.activity.issues.total_opened },
    { name: 'Comments', value: data.activity.engagement.total_comments }
  ];

  return React.createElement('div', { className: 'max-w-7xl mx-auto p-4 space-y-6' },
    React.createElement('div', { className: 'bg-white dark:bg-gray-800 rounded-lg p-6 shadow' },
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
      )
    ),

    // Add contribution summary section
    data.contribution_summary && React.createElement('div', { 
      className: 'bg-white dark:bg-gray-800 rounded-lg p-6 shadow'
    },
      React.createElement('p', { 
        className: 'text-gray-700 dark:text-gray-300 text-sm leading-relaxed'
      }, data.contribution_summary)
    ),

    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-4' },
      stats.map(stat => React.createElement(StatCard, { key: stat.name, ...stat }))
    ),

    React.createElement('div', { className: 'space-y-4' },
      React.createElement(ActivitySection, {
        title: 'Commits',
        items: data.activity.code.commits
      }),
      React.createElement(ActivitySection, {
        title: 'Pull Requests',
        items: data.activity.code.pull_requests
      }),
      React.createElement(ActivitySection, {
        title: 'Issues',
        items: data.activity.issues.opened || []
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

// Add ContributorCard component for index page
const ContributorCard = ({ contributor }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return React.createElement('div', {
    className: 'relative',
    onMouseEnter: () => setShowTooltip(true),
    onMouseLeave: () => setShowTooltip(false)
  },
    React.createElement('a', {
      href: `/profiles/${contributor.username}.html`,
      className: 'block p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow'
    },
      React.createElement('div', { className: 'flex items-center gap-3' },
        React.createElement('img', {
          src: contributor.avatar_url,
          alt: `${contributor.username}'s avatar`,
          className: 'w-10 h-10 rounded-full'
        }),
        React.createElement('div', null,
          React.createElement('h3', { className: 'font-medium' }, contributor.username),
          React.createElement('p', { className: 'text-sm text-gray-500' },
            `${contributor.total_contributions} contributions`
          )
        )
      )
    ),
    showTooltip && contributor.contribution_summary && React.createElement('div', {
      className: 'absolute z-10 p-4 mt-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg max-w-xs',
      style: { 
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)'
      }
    }, contributor.contribution_summary)
  );
};

export default ContributorProfile;
export { ContributorCard };