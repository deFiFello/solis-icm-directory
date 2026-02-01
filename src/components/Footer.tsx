'use client';

export function Footer() {
  return (
    <footer className="w-full mt-auto py-6">
      <div className="max-w-4xl mx-auto px-4">
        <div className="border-t border-border pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-text-muted text-sm">
            <div className="flex items-center gap-2">
              <span>POWERED BY</span>
              <a 
                href="https://helius.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                HELIUS
              </a>
              <span>•</span>
              <a 
                href="https://jup.ag" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                JUPITER
              </a>
            </div>
            
            <div className="flex items-center gap-4">
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-text-primary transition-colors"
              >
                Twitter
              </a>
              <a 
                href="/terms" 
                className="hover:text-text-primary transition-colors"
              >
                Terms
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
