import React, { createContext, useContext, ReactNode } from 'react'

type ActiveIconContextType = {
  activeIcon: number
}

type ActiveIconProviderProps = {
  activeIcon: number
  children: ReactNode
}

const ActiveIconContext = createContext<ActiveIconContextType | undefined>(undefined)

export const ActiveIconProvider: React.FC<ActiveIconProviderProps> = ({ activeIcon, children }) => {
  return <ActiveIconContext.Provider value={{ activeIcon }}>{children}</ActiveIconContext.Provider>
}

export const useActiveIcon = (): ActiveIconContextType => {
  const context = useContext(ActiveIconContext)
  if (!context) {
    throw new Error('useActiveIcon must be used within an ActiveIconProvider')
  }
  return context
}
