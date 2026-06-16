import Link from "next/link";
import { Shield, Github, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border-subtle bg-bg-surface/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-brand" />
              <span className="font-bold">SolVerify</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm text-text-secondary">
              The trust layer for Solana tokens. Verified ownership, secure metadata, and community trust — for $60.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-text-primary"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-text-primary"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li><Link href="/search" className="hover:text-text-primary">Search</Link></li>
              <li><Link href="/claim" className="hover:text-text-primary">Claim Token</Link></li>
              <li><Link href="/docs" className="hover:text-text-primary">API Docs</Link></li>
              <li><Link href="/dashboard" className="hover:text-text-primary">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">Resources</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li><a href="https://docs.solana.com" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary">Solana Docs</a></li>
              <li><a href="https://helius.dev" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary">Helius</a></li>
              <li><a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary">Supabase</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-border-subtle pt-6 text-sm text-text-muted">
          © {new Date().getFullYear()} SolVerify. Built for the Solana ecosystem.
        </div>
      </div>
    </footer>
  );
}
