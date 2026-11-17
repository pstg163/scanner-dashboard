import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import { routerBasename } from './lib/base'
import { deepLinkId } from './lib/shortId'
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
          <AppRoutes />
        </Shell>
      </BrowserRouter>
    </AlertsProvider>
  )
}

function AppRoutes() {
  const [search] = useSearchParams()
  const deep = deepLinkId(`?${search.toString()}`, typeof window === 'undefined' ? '' : window.location.hash)
  return (
    <Routes>
      <Route path="/" element={deep ? <DetailPage /> : <FeedPage />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/alert/:id" element={<DetailPage />} />
      <Route path="/a/:id" element={<DetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
