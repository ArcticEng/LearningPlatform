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
  title: "ACT Academy — Dementia Care Training",
  description: "ACT caregiver training platform — empowering carers with skills to deliver quality dementia care.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ACT Academy",
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a1a1c" },
    { media: "(prefers-color-scheme: light)", color: "#f4f8f9" },
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
