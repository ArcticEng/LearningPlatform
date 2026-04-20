import "./globals.css";

const themeScript = `
(function(){
  try {
    var segs = window.location.pathname.split('/').filter(Boolean);
    var slug = (segs[0] && ['admin','learner','superadmin','api','_next'].indexOf(segs[0]) === -1) ? segs[0] : '_root';
    var t = localStorage.getItem('lp-theme-' + slug) || 'dark';
    document.documentElement.dataset.theme = t;
  } catch(e) {
    document.documentElement.dataset.theme = 'dark';
  }
  // Global error reporter
  window.onerror = function(msg, src, line, col, err) {
    try {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'error', source: 'client', path: window.location.pathname, message: msg, details: (err && err.stack) || (src + ':' + line) })
      }).catch(function(){});
    } catch(e) {}
  };
  window.addEventListener('unhandledrejection', function(e) {
    try {
      var msg = e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled promise rejection';
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'error', source: 'client', path: window.location.pathname, message: msg, details: e.reason && e.reason.stack || '' })
      }).catch(function(){});
    } catch(ex) {}
  });
})();
`;

export const metadata = {
  title: "Learning Platform",
  description: "Online learning and assessment platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Learning Platform",
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d1538" },
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
