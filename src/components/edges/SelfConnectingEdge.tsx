import React, { useEffect, useState, useContext, useLayoutEffect, useRef } from 'react'
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react'
import { useEdgeLabel } from '@/contexts/EdgeLabelContext'
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
  const [currentLabel, setCurrentLabel] = useState(edgeLabels[source])
  const { editingEdgeId, setEditingEdgeId } = useContext(EditingContext)
  const [labelWidth, setLabelWidth] = useState(97)
  const labelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (labelRef.current) {
      setLabelWidth(labelRef.current.offsetWidth)
    }
  }, [edgeLabels[source], label])

  useEffect(() => {
    setCurrentLabel(edgeLabels[source])
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
      setCurrentLabel(edgeLabels[source] || (label as string))
      setEditingEdgeId(null)
    }
  }

  const handleForeignObjectDoubleClick = (e: React.MouseEvent) => {
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

    // Calculate the true midpoint of the edge
    const midX = (sourceX + targetX) / 2
    const midY = (sourceY + targetY) / 2
    // if normal conditional edge
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
            <path d='M -22.5 -18 L 0 0 L -22.5 18 Z' style={{ fill: 'black' }} />
          </marker>
        </defs>
        <BaseEdge
          {...props}
          id={id}
          path={edgePath}
          markerEnd={'url(#triangle)'}
          style={{ backgroundColor: 'black', color: 'black' }}
        />
        {label &&
          animated &&
          (editingEdgeId === id ? (
            <foreignObject
              style={{
                overflow: 'visible',
              }}
              x={midX - (labelWidth + 20) / 2}
              y={midY - 17.5}
              width={labelWidth + 20}
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
                className={`
                  bg-[#D4EDF6] outline-none border border-[#207fa5] text-center text-[#333333] w-full h-full text-xs rounded-full
                  transition-all duration-500 ease-in-out w-full
                `}
              />
            </foreignObject>
          ) : (
            <foreignObject
              style={{
                overflow: 'visible',
              }}
              x={midX - (labelWidth + 20) / 2}
              y={midY - 17.5}
              width={labelWidth + 20}
              height={35}
              onDoubleClick={handleForeignObjectDoubleClick}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  handleLabelClick(e)
                }}
                onDoubleClick={handleForeignObjectDoubleClick}
                className={`
                  bg-[#D4EDF6] border border-[#207fa5] 
                  flex items-center justify-center text-center 
                  text-[#333333] h-full text-xs rounded-full
                  w-full transition-all duration-500 ease-in-out
                `}
              >
                <span ref={labelRef} className='whitespace-nowrap text-center transition-all duration-500 ease-in-out'>
                  {edgeLabels[source] || label}
                </span>
              </div>
            </foreignObject>
          ))}
      </>
    )
  }

  const edgePath = `M ${sourceX} ${sourceY} A 60 60 0 1 0 ${targetX} ${targetY}`
  // if cycle
  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} />
      {label &&
        animated &&
        (editingEdgeId === id ? (
          <foreignObject
            style={{
              overflow: 'visible',
            }}
            x={sourceX}
            y={sourceY}
            width={labelWidth + 20}
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
              className={`
                bg-[#D4EDF6] outline-none border border-[#207fa5] text-center w-full h-full text-xs text-[#333333] rounded-full
                transition-all duration-500 ease-in-out
                w-full
              `}
            />
          </foreignObject>
        ) : (
          <foreignObject
            style={{
              overflow: 'visible',
            }}
            x={sourceX}
            y={sourceY}
            width={labelWidth + 20}
            height={35}
            onDoubleClick={handleForeignObjectDoubleClick}
          >
            <div
              onClick={(e) => {
                e.stopPropagation()
                handleLabelClick(e)
              }}
              onDoubleClick={handleForeignObjectDoubleClick}
              className={`
                bg-[#D4EDF6] border border-[#207fa5] 
                flex items-center justify-center text-center 
                text-[#333333] h-full text-xs rounded-full
                w-full transition-all duration-500 ease-in-out
              `}
            >
              <span ref={labelRef} className='whitespace-nowrap text-center transition-all duration-500 ease-in-out'>
                {edgeLabels[source] || label}
              </span>
            </div>
          </foreignObject>
        ))}
    </>
  )
}
