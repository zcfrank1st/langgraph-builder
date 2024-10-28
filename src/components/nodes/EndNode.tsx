import { Handle, Position } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import { useMemo } from 'react'
import { useActiveIcon } from '@/contexts/ActiveIconContext'

export type EndNode = Node

export default function EndNode() {
  const { activeIcon } = useActiveIcon()
  const randomBorderColor = useMemo(() => {
    const hue = Math.floor(Math.random() * 360)
    const saturation = 70 + Math.random() * 30
    const lightness = 60 + Math.random() * 20
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }, [])

  return (
    <div
      className=' rounded-3xl p-[0.5px]  '
      style={{ border: `1px solid ${randomBorderColor}`, backgroundColor: randomBorderColor }}
    >
      <div className='p-3 px-8 rounded-3xl' style={{ color: randomBorderColor, backgroundColor: `rgba(26,26,36,0.8)` }}>
        __end__
      </div>
      {activeIcon !== 1 && <Handle type='target' style={{ width: '10px', height: '10px' }} position={Position.Top} />}
    </div>
  )
}
