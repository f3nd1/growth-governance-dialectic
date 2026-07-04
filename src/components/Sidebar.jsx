import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { NAV_GROUPS } from '../nav'

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState({})

  function toggle(id) {
    setCollapsed((c) => ({ ...c, [id]: !c[id] }))
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        governance-growth-dialectic
        <small>synthetic-participant pilot pipeline</small>
      </div>
      <nav aria-label="Primary">
        {NAV_GROUPS.map((group) => {
          const open = !collapsed[group.id]
          return (
            <div key={group.id}>
              <button
                className="nav-group-header"
                aria-expanded={open}
                onClick={() => toggle(group.id)}
              >
                <span>{group.label}</span>
                <span className="chev" aria-hidden="true">▼</span>
              </button>
              {open &&
                group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/' || item.path === '/settings'}
                    className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
                  >
                    {item.label}
                  </NavLink>
                ))}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
