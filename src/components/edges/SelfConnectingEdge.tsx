import React, { useEffect, useState, useContext } from 'react'
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react'
import { useEdgeLabel } from '@/contexts/EdgeLabelContext'
import { useButtonText } from '@/contexts/ButtonTextContext'
import { EditingContext } from '@/contexts/EditingContext'

interface SelfConnectingEdgeProps extends EdgeProps {
  data?: {
    onLabelClick: (id: string) => void
    updateEdgeLabel: (id: string, newLabel: string) => void
  }
}

export default function SelfConnectingEdge(props: SelfConnectingEdgeProps) {
  const { sourceX, sourceY, targetX, targetY, id, markerEnd, source, label, animated } = props
  const { edgeLabels, updateEdgeLabel } = useEdgeLabel()
  const { buttonTexts } = useButtonText()
  const [currentLabel, setCurrentLabel] = useState(edgeLabels[source] || 'default_edge_name')
  const { editingEdgeId, setEditingEdgeId } = useContext(EditingContext)

  useEffect(() => {
    setCurrentLabel(edgeLabels[source] || 'default_edge_name')
  }, [edgeLabels, source])

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingEdgeId(id)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    setCurrentLabel(e.target.value)
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.stopPropagation()
    updateEdgeLabel(source, currentLabel)
    setEditingEdgeId(null)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()

    if (e.key === 'Enter') {
      updateEdgeLabel(source, currentLabel)
      setEditingEdgeId(null)
    }
    if (e.key === 'Escape') {
      setCurrentLabel(
        edgeLabels[source] || `conditional_${buttonTexts[source]?.replaceAll(' ', '_')}` || (label as string),
      )
      setEditingEdgeId(null)
    }
  }

  const handleForeignObjectDoubleClick = (e: React.MouseEvent) => {
    console.log('double clicked')
    e.stopPropagation()
    e.preventDefault()
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
          (editingEdgeId === id ? (
            <foreignObject
              x={labelX - 70}
              y={labelY - 10}
              width={130}
              height={35}
              onDoubleClick={handleForeignObjectDoubleClick}
            >
              <input
                type='text'
                value={currentLabel}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                autoFocus
                onKeyDown={(e) => {
                  e.stopPropagation()
                  handleInputKeyDown(e)
                }}
                onClick={(e) => {
                  e.stopPropagation()
                }}
                onDoubleClick={handleForeignObjectDoubleClick}
                className='bg-[#2596be] outline-none border border-2 border-[#207fa5] text-center text-white w-full h-full text-xs text-white rounded'
              />
            </foreignObject>
          ) : (
            <foreignObject
              x={labelX - 70}
              y={labelY - 10}
              width={130}
              height={35}
              onDoubleClick={handleForeignObjectDoubleClick}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  handleLabelClick(e)
                }}
                onDoubleClick={handleForeignObjectDoubleClick}
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
        (editingEdgeId === id ? (
          <foreignObject
            x={sourceX + 30}
            y={sourceY + 5}
            width={130}
            height={35}
            onDoubleClick={handleForeignObjectDoubleClick}
          >
            <input
              type='text'
              value={currentLabel}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={(e) => {
                e.stopPropagation()
                handleInputKeyDown(e)
              }}
              onClick={(e) => {
                e.stopPropagation()
              }}
              onDoubleClick={handleForeignObjectDoubleClick}
              autoFocus
              className='bg-[#2596be] outline-none border border-2 border-[#207fa5] text-center text-white w-full h-full text-xs text-white rounded'
            />
          </foreignObject>
        ) : (
          <foreignObject
            x={sourceX + 30}
            y={sourceY + 5}
            width={130}
            height={35}
            onDoubleClick={handleForeignObjectDoubleClick}
          >
            <div
              onClick={(e) => {
                e.stopPropagation()
                handleLabelClick(e)
              }}
              onDoubleClick={handleForeignObjectDoubleClick}
              className='bg-[#2596be] border border-2 border-[#207fa5] flex justify-center items-center flex text-center text-white w-full h-full text-xs text-white rounded'
            >
              <div className='px-2'>{edgeLabels[source] || label}</div>
            </div>
          </foreignObject>
        ))}
    </>
  )
}
