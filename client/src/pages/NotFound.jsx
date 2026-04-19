import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <div className="text-5xl font-bold text-slate-800">404</div>
        <p className="mt-2 text-slate-500">Page not found.</p>
        <Link to="/" className="btn-primary mt-5 inline-flex">Home</Link>
      </div>
    </div>
  );
}
