import ReduxProvider from '../components/ReduxProvider';

export const metadata = {
  title: 'UNO Game',
  description: 'Play UNO online with friends',
}

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
