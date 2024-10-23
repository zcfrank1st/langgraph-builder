import React, { useEffect, useState } from 'react'
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react'
import { useEdgeLabel } from '@/contexts/EdgeLabelContext'
import { useButtonText } from '@/contexts/ButtonTextContext'
import { useActiveIcon } from '@/contexts/ActiveIconContext'

interface SelfConnectingEdgeProps extends EdgeProps {
  data?: {
    onLabelClick: (id: string) => void
    updateEdgeLabel: (id: string, newLabel: string) => void
  }
}

export default function SelfConnectingEdge(props: SelfConnectingEdgeProps) {
  const { sourceX, sourceY, targetX, targetY, id, markerEnd, source, label, animated } = props
  const { activeIcon } = useActiveIcon()
  const { edgeLabels, updateEdgeLabel } = useEdgeLabel()
  const { buttonTexts } = useButtonText()
  const [isEditing, setIsEditing] = useState(false)
  const [currentLabel, setCurrentLabel] = useState(edgeLabels[source] || 'default_edge_name')

  useEffect(() => {
    // Sync currentLabel with the context whenever the edgeLabels or source changes
    setCurrentLabel(edgeLabels[source] || 'default_edge_name')
  }, [edgeLabels, source])

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (activeIcon === 1 || activeIcon === 0) {
      return
    }
    setIsEditing(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    setCurrentLabel(e.target.value)
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.stopPropagation()
    updateEdgeLabel(source, currentLabel)
    setIsEditing(false)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      updateEdgeLabel(source, currentLabel)
      setIsEditing(false)
    }
    if (e.key === 'Escape') {
      setCurrentLabel(
        edgeLabels[source] || `conditional_${buttonTexts[source]?.replaceAll(' ', '_')}` || (label as string),
      )
      setIsEditing(false)
    }
  }

  if (props.source !== props.target) {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    })

    return (
      <>
        <defs>
          <marker
            id='triangle'
            markerWidth='5'
            markerHeight='18'
            viewBox='-15 -15 30 30'
            markerUnits='strokeWidth'
            orient='auto-start-reverse'
            refX='0'
            refY='0'
          >
            <path d='M -22.5 -18 L 0 0 L -22.5 18 Z' style={{ fill: 'var(--primary)' }} />
          </marker>
        </defs>
        <BaseEdge {...props} id={id} path={edgePath} markerEnd={'url(#triangle)'} />
        {label &&
          animated &&
          (isEditing ? (
            <foreignObject className='pointer-events-none' x={labelX - 70} y={labelY - 10} width={130} height={35}>
              <input
                disabled={activeIcon === 1 || activeIcon === 0}
                data-stop-propagation='true'
                type='text'
                value={currentLabel}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                autoFocus
                onKeyDown={(e) => {
                  e.stopPropagation()
                  handleInputKeyDown(e)
                }}
                className='cursor-none bg-[#2596be] pointer-events-none outline-none border border-2 border-[#207fa5] text-center text-white w-full h-full text-xs text-white rounded'
              />
            </foreignObject>
          ) : (
            <foreignObject x={labelX - 70} y={labelY - 10} width={130} height={35}>
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  handleLabelClick(e)
                }}
                data-stop-propagation='true'
                className='bg-[#2596be] border border-2 border-[#207fa5] flex justify-center items-center flex text-center text-white w-full h-full text-xs text-white rounded'
              >
                {edgeLabels[source] || label}
              </div>
            </foreignObject>
          ))}
      </>
    )
  }

  const edgePath = `M ${sourceX} ${sourceY} A 60 60 0 1 0 ${targetX} ${targetY}`

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} />
      {label &&
        animated &&
        (isEditing ? (
          <foreignObject x={sourceX + 30} y={sourceY + 5} width={130} height={35}>
            <input
              disabled={activeIcon === 1 || activeIcon === 0}
              type='text'
              value={currentLabel}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={(e) => {
                e.stopPropagation()
                handleInputKeyDown(e)
              }}
              autoFocus
              data-stop-propagation='true'
              className='cursor-none bg-[#2596be] pointer-events-none outline-none border border-2 border-[#207fa5] text-center text-white w-full h-full text-xs text-white rounded'
            />
          </foreignObject>
        ) : (
          <foreignObject x={sourceX + 30} y={sourceY + 5} width={130} height={35}>
            <div
              onClick={(e) => {
                e.stopPropagation()
                handleLabelClick(e)
              }}
              data-stop-propagation='true'
              className='bg-[#2596be] border border-2 border-[#207fa5] flex justify-center items-center flex text-center text-white w-full h-full text-xs text-white rounded'
            >
              <div className='px-2'>{edgeLabels[source] || label}</div>
            </div>
          </foreignObject>
        ))}
    </>
  )
}
