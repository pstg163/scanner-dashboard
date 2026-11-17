import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { routerBasename } from './lib/base'
import { PinPad } from './components/PinPad'
import { Shell } from './components/Shell'
import { DetailPage } from './pages/DetailPage'
import { FeedPage } from './pages/FeedPage'
import { MapPage } from './pages/MapPage'
import { AlertsProvider } from './state/alerts'
import { SessionProvider, useSession } from './state/session'

export default function App() {
  return (
    <SessionProvider>
      <Gate />
    </SessionProvider>
  )
}

function Gate() {
  const { pin } = useSession()
  if (!pin) return <PinPad />
  return (
    <AlertsProvider pin={pin}>
      <BrowserRouter basename={routerBasename(import.meta.env.BASE_URL)}>
        <Shell>
          <Routes>
            <Route path="/" element={<FeedPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/alert/:id" element={<DetailPage />} />
            <Route path="/a/:id" element={<DetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AlertsProvider>
  )
}
