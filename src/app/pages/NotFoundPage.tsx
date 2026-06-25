import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="empty-state">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p className="page-copy">This route is not in the current customer panel scaffold.</p>
      <Link className="primary-button" to="/">Back to dashboard</Link>
    </div>
  );
}
