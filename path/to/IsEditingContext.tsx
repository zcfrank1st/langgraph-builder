import React, { createContext, useContext, useState } from 'react'

interface EditingContextProps {
  isEditing: boolean
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
}

const EditingContext = createContext<EditingContextProps | undefined>(undefined)

interface EditingProviderProps {
  children: React.ReactNode
}

export const EditingProvider: React.FC<EditingProviderProps> = ({ children }) => {
  const [isEditing, setIsEditing] = useState(false)

  return <EditingContext.Provider value={{ isEditing, setIsEditing }}>{children}</EditingContext.Provider>
}

export const useEditing = () => {
  const context = useContext(EditingContext)
  if (!context) {
    throw new Error('useEditing must be used within an EditingProvider')
  }
  return context
}
