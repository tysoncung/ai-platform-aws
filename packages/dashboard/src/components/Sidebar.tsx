import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Overview' },
  { to: '/costs', label: 'Cost Analytics' },
  { to: '/agents', label: 'Agent Runs' },
  { to: '/prompts', label: 'Prompts' },
  { to: '/settings', label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-800 border-r border-gray-700 p-4 flex flex-col gap-1">
      <h1 className="text-lg font-bold text-accent mb-6">AI Gateway</h1>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            `px-3 py-2 rounded text-sm ${isActive ? 'bg-gray-700 text-accent font-medium' : 'text-gray-300 hover:bg-gray-700/50'}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </aside>
  );
}
