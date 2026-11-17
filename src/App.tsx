
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './style.css'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: '' }
  }

  static getDerivedStateFromError(error: Error) {
    return { error: error.message || String(error) }
  }

  componentDidCatch(error: Error) {
    console.error('Rimel Studio Error:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: '#0b0c0f',
          color: '#fff',
          minHeight: '100vh',
          padding: '30px',
          fontFamily: 'sans-serif'
        }}>
          <h2 style={{ color: '#d4af37' }}>Rimel Studio Error</h2>
          <p>সমস্যাটি শনাক্ত হয়েছে:</p>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#ff7777' }}>
            {this.state.error}
          </pre>
          <p>এই লেখাটির স্ক্রিনশট পাঠান।</p>
        </div>
      )
    }

    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
