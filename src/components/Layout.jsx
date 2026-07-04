import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import SavePill from './SavePill'
import { NAV_GROUPS } from '../nav'
import { useWorkspace } from '../store/dataStore'
import changelog from '../data/changelog.json'

function currentPageMeta(pathname) {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.path === pathname) return { group: group.label, item }
    }
  }
  return null
}

export default function Layout() {
  const location = useLocation()
  const meta = currentPageMeta(location.pathname)
  const ws = useWorkspace()
  const latest = changelog.entries?.[0]

  return (
    <div className="app-frame">
      <div className="synthetic-banner" role="alert">
        PILOT · INSTRUMENT VALIDATION — synthetic data, not real findings
      </div>
      <div className="app-body">
        <Sidebar />
        <div className="main-col">
          <header className="app-header">
            <span className="crumb">
              {meta ? `${meta.group} / ${meta.item.label}` : 'governance-growth-dialectic'}
            </span>
            <SavePill />
          </header>
          <main className="page" id="main">
            <div className="page-inner">
              <Outlet />
              {ws.settings.developer && latest && (
                <footer className="muted small" style={{ marginTop: 40, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
                  dev · latest change: <code>{latest.commit}</code> — {latest.message}
                </footer>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
