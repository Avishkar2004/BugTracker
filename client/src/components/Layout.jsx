import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bug,
  CirclePlus,
  Columns3,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../lib/theme.js";
import { Avatar } from "./ui.jsx";

/*
 * NavLink ignores the query string, so "/bugs" and "/bugs?assignee=me" would both
 * light up. Each entry carries its own matcher instead.
 */
const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, match: (path) => path === "/" },
  {
    to: "/bugs",
    label: "All bugs",
    icon: ListFilter,
    match: (path, params) => path === "/bugs" && params.get("assignee") !== "me",
  },
  {
    to: "/board",
    label: "Board",
    icon: Columns3,
    match: (path) => path === "/board",
  },
  {
    to: "/bugs?assignee=me&open=true",
    label: "Assigned to me",
    icon: UserRoundCheck,
    match: (path, params) => path === "/bugs" && params.get("assignee") === "me",
  },
  {
    to: "/bugs/new",
    label: "Report a bug",
    icon: CirclePlus,
    match: (path) => path === "/bugs/new",
  },
  { to: "/team", label: "Team", icon: Users, match: (path) => path === "/team", adminOnly: true },
];

function Wordmark({ size = "base" }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand text-on-accent shadow-xs">
        <Bug className="size-[1.125rem]" aria-hidden="true" strokeWidth={2.1} />
      </span>
      <span className={`font-bold tracking-tight text-fg ${size === "base" ? "text-base" : "text-sm"}`}>
        Bug Tracker
      </span>
    </span>
  );
}

/*
 * The active marker is one absolutely-positioned pill that slides between items
 * rather than a background on each link, so switching pages reads as a single
 * continuous movement. Geometry is measured from the live DOM, which keeps it
 * correct when the Team entry is hidden for non-admins.
 */
function NavList({ items, pathname, params, onNavigate }) {
  const listRef = useRef(null);
  const [pill, setPill] = useState(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]');
    setPill(active ? { top: active.offsetTop, height: active.offsetHeight } : null);
  }, [pathname, params, items.length]);

  // Skip the transition on the very first paint — otherwise the pill flies in
  // from the top of the list on every full page load.
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <nav ref={listRef} className="relative space-y-1" aria-label="Main">
      {pill && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 rounded-md bg-brand shadow-xs"
          style={{
            height: pill.height,
            transform: `translateY(${pill.top}px)`,
            transition: animate
              ? "transform var(--dur-base) var(--ease-smooth), height var(--dur-base) var(--ease-smooth)"
              : "none",
          }}
        />
      )}

      {items.map((item) => {
        const active = item.match(pathname, params);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            data-active={active || undefined}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              active ? "text-on-accent" : "text-fg-muted hover:bg-hover hover:text-fg"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeToggle({ theme, onToggle }) {
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      className="btn-icon"
      aria-pressed={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {/* Both icons stay mounted and cross-rotate, so the swap has no flicker. */}
      <span className="relative grid size-4 place-items-center">
        <Sun
          className="absolute size-4 transition-all duration-200 ease-smooth"
          style={{ opacity: dark ? 0 : 1, transform: `rotate(${dark ? -90 : 0}deg) scale(${dark ? 0.6 : 1})` }}
          aria-hidden="true"
        />
        <Moon
          className="absolute size-4 transition-all duration-200 ease-smooth"
          style={{ opacity: dark ? 1 : 0, transform: `rotate(${dark ? 0 : 90}deg) scale(${dark ? 1 : 0.6})` }}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}

function SidebarBody({ user, pathname, params, items, onNavigate, onSignOut, theme, onToggleTheme }) {
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-2 px-1">
        <Wordmark />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <NavList items={items} pathname={pathname} params={params} onNavigate={onNavigate} />

      <div className="mt-auto border-t border-line pt-4">
        <div className="flex items-center gap-2.5 px-1">
          <Avatar user={user} size={34} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{user?.name}</p>
            <p className="truncate text-xs capitalize text-fg-subtle">{user?.role}</p>
          </div>
        </div>
        <button type="button" onClick={onSignOut} className="btn-ghost mt-3 w-full">
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const items = NAV.filter((item) => !item.adminOnly || user?.role === "admin");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const triggerRef = useRef(null);

  const signOut = () => {
    logout();
    navigate("/login");
  };

  // Escape closes the drawer, and the page behind it must not scroll while it is open.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    drawerRef.current?.querySelector("a, button")?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="flex min-h-full">
      <a
        href="#main"
        className="sr-only rounded-md bg-brand px-3 py-2 text-sm text-on-accent focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
      >
        Skip to content
      </a>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-raised p-4 md:flex">
        <SidebarBody
          user={user}
          items={items}
          pathname={location.pathname}
          params={params}
          onSignOut={signOut}
          theme={theme}
          onToggleTheme={toggle}
        />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="scrim w-full cursor-default"
            aria-label="Close navigation"
            onClick={closeDrawer}
          />
          <aside
            ref={drawerRef}
            className="drawer absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-raised p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <button
              type="button"
              onClick={closeDrawer}
              className="btn-icon absolute right-3 top-3"
              aria-label="Close navigation"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
            <SidebarBody
              user={user}
              items={items}
              pathname={location.pathname}
              params={params}
              onNavigate={() => setDrawerOpen(false)}
              onSignOut={signOut}
              theme={theme}
              onToggleTheme={toggle}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-raised/85 px-3 py-2.5 backdrop-blur-md md:hidden">
          <button
            ref={triggerRef}
            type="button"
            className="btn-icon"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <Wordmark size="sm" />
          <span className="ml-auto flex items-center gap-1">
            <ThemeToggle theme={theme} onToggle={toggle} />
            <Link to="/bugs/new" className="btn-primary px-3" aria-label="Report a bug">
              <CirclePlus className="size-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">New</span>
            </Link>
          </span>
        </header>

        <main id="main" className="flex-1 overflow-x-hidden p-4 md:p-8">
          {/* Keyed on pathname so the enter animation replays on every route change. */}
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
