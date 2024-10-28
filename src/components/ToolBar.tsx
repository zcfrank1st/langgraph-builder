import React from 'react'
import { Button } from '@mui/joy'
import { Trash2, PenLine } from 'lucide-react'

interface ToolbarProps {
  setActiveIcon: (id: number) => void
  activeIcon: number
}

const Toolbar = ({ setActiveIcon, activeIcon }: ToolbarProps) => {
  const icons = [
    { id: 0, name: 'Edge', component: <PenLine size={25} /> },
    { id: 1, name: 'Eraser', component: <Trash2 size={25} /> },
  ]

  return (
    <div className='fixed left-8 top-1/2 transform -translate-y-1/2 z-50'>
      <div className='flex flex-col'>
        <div className='flex flex-col rounded-lg shadow-md'>
          {icons.map((icon) => (
            <div key={icon.id} className='relative'>
              <Button
                className={`m-1 p-2 ${
                  activeIcon === icon.id ? 'bg-slate-900' : 'bg-slate-800'
                } rounded hover:bg-slate-900 focus:outline-none`}
                onClick={() => {
                  setActiveIcon(icon.id)
                }}
              >
                {icon.component}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Toolbar
