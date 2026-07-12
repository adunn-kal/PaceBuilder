import { createContext, useContext, useState } from 'react'

// Lets any component (the Landing button, the navbar) open the shared "My Plans"
// modal without prop-drilling. The modal itself lives once at the App root.
const PlansModalContext = createContext(null)

export function PlansModalProvider({ children }) {
  const [show, setShow] = useState(false)
  const value = {
    show,
    open: () => setShow(true),
    close: () => setShow(false),
  }
  return <PlansModalContext.Provider value={value}>{children}</PlansModalContext.Provider>
}

export function usePlansModal() {
  return useContext(PlansModalContext)
}
