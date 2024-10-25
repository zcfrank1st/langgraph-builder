import React from 'react'
import { Switch } from '@/components/ui/switch'
import Image from 'next/image'
import { Button } from '@mui/joy'
import { SquareMousePointer, PenLine, Hand, Eraser } from 'lucide-react'

interface ToolbarProps {
  setActiveIcon: (id: number) => void
  activeIcon: number
  isLocked: boolean
  setIsLocked: (value: boolean) => void
}

const Toolbar = ({ setActiveIcon, activeIcon, isLocked, setIsLocked }: ToolbarProps) => {
  const icons = [
    { id: 0, name: 'Node', component: <SquareMousePointer size={20} /> },
    { id: 1, name: 'Position', component: <Hand size={20} /> },
    { id: 2, name: 'Edge', component: <PenLine size={20} /> },
    { id: 3, name: 'Eraser', component: <Eraser size={20} /> },
    { id: 4, name: 'Type', component: <Image src='/python.png' alt='Type' width={20} height={20} /> },
    { id: 5, name: 'Type', component: <Image src='/javascript.png' alt='Type' width={20} height={20} /> },
  ]

  return (
    <div className='flex flex-row gap-x-3 justify-center items-center p-2  fixed left-1/2 transform -translate-x-1/2 top-10 z-50'>
      <div className='flex flex-row bg-slate-900 rounded-lg shadow-md'>
        {icons.map((icon) => (
          <div key={icon.id} className='relative'>
            <Button
              key={icon.id}
              className={`m-1 p-2 ${
                activeIcon === icon.id ? 'bg-slate-900' : 'bg-slate-800'
              } rounded hover:bg-slate-900 focus:outline-none`}
              onClick={() => {
                setActiveIcon(icon.id)
                setIsLocked(false)
              }}
            >
              {icon.component}
            </Button>
          </div>
        ))}
      </div>
      {activeIcon === 2 && (
        <div
          className={`flex flex-row justify-center items-center gap-x-3 transition-opacity duration-500 ease-out opacity-100 transform-gpu translate-y-0 ${
            activeIcon === 2 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          <Switch
            checked={isLocked}
            onCheckedChange={(checked) => setIsLocked(checked)}
            className='data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-slate-100'
          />
          <div className='text-md text-slate-100'>Lock edges</div>
        </div>
      )}
    </div>
  )
}

export default Toolbar
