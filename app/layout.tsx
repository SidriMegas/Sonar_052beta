import './globals.css'
import Navbar from './components/navbar'
import GlobalClientServices from './components/GlobalClientServices'

export const metadata = {
  title: 'MANSAMIDAS - Le Cycle Éternel',
  description: 'Partage et découvre des pépites musicales.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-black text-white antialiased min-h-screen flex flex-col">

        {/* Services client globaux non critiques */}
        <GlobalClientServices />

        {/* Barre de navigation */}
        <Navbar />

        {/* Contenu de la page */}
        <main className="w-full flex-grow">
          {children} 
        </main>

        {/* Footer */}
        <footer className="bg-[#050505] border-t border-gray-900 pt-10 pb-6 px-8 mt-auto">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-gray-400">
            <div>
              <h3 className="font-bold mb-3 text-white tracking-tighter uppercase">MANSAMIDAS</h3>
              <p className="text-xs">Le cycle éternel de la musique.</p>
            </div>
            <div>
              <h4 className="font-bold mb-3 text-[10px] uppercase tracking-[0.2em] text-gray-600">Légal</h4>
              <ul className="space-y-1 text-xs">
                <li className="hover:text-white cursor-pointer transition-colors">Mentions légales</li>
                <li className="hover:text-white cursor-pointer transition-colors">Confidentialité</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3 text-[10px] uppercase tracking-[0.2em] text-gray-600">Contact</h4>
              <p className="text-xs">contact@mansamidas.com</p>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-gray-900/50 text-center text-gray-700 text-[9px] uppercase tracking-widest">
            © 2026 MANSAMIDAS.
          </div>
        </footer>

      </body>
    </html>
  )
}