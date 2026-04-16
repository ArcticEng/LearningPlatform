import "./globals.css";

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('lp-theme') || 'dark';
    document.documentElement.dataset.theme = t;
  } catch(e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`;

export const metadata = {
  title: "LearnPulse — Online Course Platform",
  description: "Online learning platform with courses, modules, and assessments",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LearnPulse",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f1117" },
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
