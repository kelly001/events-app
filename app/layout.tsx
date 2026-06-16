import './globals.css'

export const metadata = {
  title: 'RU Events Helsinki',
  description: 'Русскоязычные события в Хельсинки'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-page-bg text-text-color min-h-screen">{children}</body>
    </html>
  )
}
