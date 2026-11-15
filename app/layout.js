import './globals.css';

export const metadata = {
  title: 'Pendaftaran Keahlian JLB',
  icons: { icon: '/logo.jpg' },
  description: 'Borang pendaftaran keahlian JLB',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}
