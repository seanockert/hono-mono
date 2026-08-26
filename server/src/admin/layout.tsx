import type { Context } from 'hono';
import { html } from 'hono/html';
import type { Child, FC } from 'hono/jsx';
import { ADMIN_MODELS, modelLabel } from '../lib/models';

// Inline, so the admin needs no build step and no shared asset.
const STYLES = `
:root {
  color-scheme: light dark;
  --bg: #fff;
  --fg: #14171a;
  --muted: #656e77;
  --line: #d8dde2;
  --accent: #1a56db;
  --danger: #b42318;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #14171a;
    --fg: #e8ebee;
    --muted: #9aa4ae;
    --line: #2c3238;
    --accent: #7aa2f7;
    --danger: #f2776b;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
}
a { color: var(--accent); }
header {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: baseline;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--line);
}
header nav { display: flex; flex-wrap: wrap; gap: 1rem; align-items: baseline; }
header strong { font-size: 1.05rem; }
main { padding: 1.5rem; max-width: 70rem; }
h1 { font-size: 1.3rem; margin: 0 0 1rem; }
h2 { font-size: 1.05rem; margin: 2rem 0 0.75rem; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--line); }
th { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
td form { display: inline; }
input, select, textarea, button {
  font: inherit;
  color: inherit;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--bg);
}
textarea { width: 100%; min-height: 9rem; }
button { cursor: pointer; }
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
button.danger { color: var(--danger); }
.row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.field { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; max-width: 34rem; }
.field label { font-size: 0.85rem; color: var(--muted); }
.muted { color: var(--muted); }
.notice { padding: 0.6rem 0.8rem; border: 1px solid var(--danger); border-radius: 4px; color: var(--danger); margin-bottom: 1rem; }
.center { max-width: 22rem; margin: 4rem auto; padding: 0 1.5rem; }
`;

type LayoutProps = {
  c: Context;
  title: string;
  /** Absent on the login and forbidden pages, which show no nav. */
  email?: string;
  children?: Child;
};

const Shell: FC<LayoutProps> = ({ c, title, email, children }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="noindex" />
      <title>{title} - Admin</title>
      <style nonce={c.get('secureHeadersNonce')} dangerouslySetInnerHTML={{ __html: STYLES }} />
    </head>
    <body>
      {email ? (
        <header>
          <nav>
            <strong>Admin</strong>
            {ADMIN_MODELS.map((model) => (
              <a href={`/admin/${model}`}>{modelLabel(model)}</a>
            ))}
            <a href="/admin/users">Users</a>
          </nav>
          <div class="row">
            <div class="muted">{email}</div>
            <form method="post" action="/admin/logout">
              <button type="submit">Sign out</button>
            </form>
          </div>
        </header>
      ) : null}
      <main class={email ? undefined : 'center'}>{children}</main>
    </body>
  </html>
);

// The doctype is prepended here because JSX cannot express it.
export const page = (c: Context, props: Omit<LayoutProps, 'c'>) =>
  c.html(html`<!doctype html>${<Shell c={c} {...props} />}`);

/** A mounted sub-app's notFound is ignored, and the app-wide one answers JSON. */
export const notFoundPage = (c: Context, email?: string) => {
  c.status(404);
  return page(c, {
    title: 'Not found',
    email,
    children: (
      <>
        <h1>Not found</h1>
        <p class="muted">No such page.</p>
      </>
    ),
  });
};
