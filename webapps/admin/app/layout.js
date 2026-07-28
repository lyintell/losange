import { Geist } from 'next/font/google';
import './globals.css';
import { APP_NAME } from '@/lib/theme/colors';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata = {
  title: `${APP_NAME} Admin`,
  description: 'Administration Losange — chantiers, devis et paramètres.',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png', type: 'image/png' }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
