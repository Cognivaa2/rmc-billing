import { Link } from 'react-router-dom';

export default function Forbidden() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <div className="text-5xl font-bold text-slate-800">403</div>
        <p className="mt-2 text-slate-500">You don't have access to this area.</p>
        <Link to="/" className="btn-primary mt-5 inline-flex">Back</Link>
      </div>
    </div>
  );
}
