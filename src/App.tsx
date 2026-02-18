import { Navigate, Route, Routes } from 'react-router-dom'
import { VaultPage } from './features/vault/pages/vault-page'

function App() {
  return (
    <Routes>
      <Route path="/" element={<VaultPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
