'use client'
import Image from 'next/image'
import type { Node } from '@xyflow/react'
import { useCallback, useState, useRef, useEffect } from 'react'
import {
  Background,
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  OnConnectStart,
  type OnConnect,
  applyNodeChanges,
  type Edge,
} from '@xyflow/react'
import { MarkerType } from 'reactflow'
import '@xyflow/react/dist/style.css'
import { initialNodes, nodeTypes, type CustomNodeType } from './nodes'
import { initialEdges, edgeTypes, type CustomEdgeType } from './edges'
import { generateLanggraphCode } from '../codeGeneration/generateLanggraph'
import { generateLanggraphJS } from '../codeGeneration/generateLanggraphJS'
import { CodeGenerationResult } from '../codeGeneration/types'
import { useButtonText } from '@/contexts/ButtonTextContext'
import { useEdgeLabel } from '@/contexts/EdgeLabelContext'
import { Modal as MuiModal, ModalDialog, Tooltip } from '@mui/joy'
import { X, Copy, Info } from 'lucide-react'
import { Highlight, themes } from 'prism-react-renderer'

import GenericModal from './GenericModal'

type OnboardingStep = {
  key: string
  type: 'modal' | 'tooltip'
  title?: string
  content: string | JSX.Element
  buttonText?: string
  imageUrl?: string
  placement?: TooltipPlacement
  tooltipWrapperStyle?: {
    className?: string
    style?: React.CSSProperties
  }
  nodes?: Node[]
  edges?: Edge[]
}

type TooltipPlacement =
  | 'top'
  | 'left'
  | 'bottom'
  | 'right'
  | 'bottom-end'
  | 'bottom-start'
  | 'left-end'
  | 'left-start'
  | 'right-end'
  | 'right-start'
  | 'top-end'
  | 'top-start'

export default function App() {
  const proOptions = { hideAttribution: true }
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<CustomEdgeType>(initialEdges)
  const [generateCodeModalOpen, setGenerateCodeModalOpen] = useState(false)
  const reactFlowWrapper = useRef<any>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<CodeGenerationResult | null>(null)
  const { buttonTexts } = useButtonText()
  const [maxNodeLength, setMaxNodeLength] = useState(0)
  const [maxEdgeLength, setMaxEdgeLength] = useState(0)
  const { edgeLabels, updateEdgeLabel } = useEdgeLabel()

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const [initialOnboardingComplete, setInitialOnboardingComplete] = useState<boolean | null>(null)
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0)
  const [codeType, setCodeType] = useState<'python' | 'js'>('python')
  const [infoPanelOpen, setInfoPanelOpen] = useState(false)

  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
  }, [nodes, edges])

  useEffect(() => {
    const initialComplete = localStorage.getItem('initialOnboardingComplete')
    setInitialOnboardingComplete(initialComplete === 'true' ? true : false)
  }, [])

  const onboardingSteps: OnboardingStep[] = [
    {
      key: 'tooltip1',
      type: 'modal',
      placement: 'top' as TooltipPlacement,
      title: 'Graph Builder',
      content: (
        <span>
          Use this tool to quickly prototype the architecture of your agent. Let's get started with a quick onboarding!
        </span>
      ),
      buttonText: 'Start',
      imageUrl: '/langgraph-logo.png',
    },
    {
      key: 'tooltip2',
      type: 'tooltip',
      placement: 'top' as TooltipPlacement,
      title: '1 of 4: How to create a node',
      content: '⌘ + click anywhere on the canvas to create a node',
      nodes: [
        { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: { label: 'source' } },
        { id: 'end', type: 'end', position: { x: 0, y: 600 }, data: { label: 'end' } },
        { id: 'custom1', type: 'custom', position: { x: 0, y: 200 }, data: { label: 'First node' } },
      ],
    },
    {
      key: 'tooltip3',
      type: 'tooltip',
      placement: 'left' as TooltipPlacement,
      title: '2 of 4: How to create an edge',
      content: 'Connect two nodes by dragging from the bottom of one node to the top of another',
      nodes: [
        { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: { label: 'source' } },
        { id: 'end', type: 'end', position: { x: 0, y: 600 }, data: { label: 'end' } },
        { id: 'custom1', type: 'custom', position: { x: 0, y: 200 }, data: { label: 'First node' } },
      ],
      edges: [{ id: 'source->custom1', source: 'source', target: 'custom1' }],
      tooltipWrapperStyle: {
        className: 'fixed inset-0 flex items-start justify-center pointer-events-none',
        style: { paddingRight: '200px', paddingTop: '230px' },
      },
    },
    {
      key: 'tooltip4',
      type: 'tooltip',
      placement: 'right' as TooltipPlacement,
      title: '3 of 4: Create a conditional edge',
      content: 'Connect one node to multiple nodes in order to create a conditional edge',
      nodes: [
        { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: { label: 'source' } },
        { id: 'end', type: 'end', position: { x: 0, y: 600 }, data: { label: 'end' } },
        { id: 'custom1', type: 'custom', position: { x: 0, y: 200 }, data: { label: 'First node' } },
        { id: 'custom2', type: 'custom', position: { x: -200, y: 350 }, data: { label: 'Destination 1' } },
        { id: 'custom3', type: 'custom', position: { x: 200, y: 350 }, data: { label: 'Destination 2' } },
      ],
      edges: [
        { id: 'source->custom1', source: 'source', target: 'custom1' },
        { id: 'custom1->custom2', source: 'custom1', target: 'custom2', animated: true },
        { id: 'custom1->custom3', source: 'custom1', target: 'custom3', animated: true },
        { id: 'custom2->end', source: 'custom2', target: 'end' },
        { id: 'custom3->end', source: 'custom3', target: 'end' },
      ],
      tooltipWrapperStyle: {
        className: 'fixed inset-0 flex items-start justify-center pointer-events-none',
        style: { paddingTop: '350px', paddingLeft: '300px' },
      },
    },
    {
      key: 'tooltip5',
      type: 'tooltip',
      placement: 'left' as TooltipPlacement,
      title: '4 of 4: Generate Code',
      content:
        "Once you're finished designing the architecture of your graph, you can generate boilerplate code for the agent using this button",
      nodes: [
        { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: { label: 'source' } },
        { id: 'end', type: 'end', position: { x: 0, y: 600 }, data: { label: 'end' } },
        { id: 'custom1', type: 'custom', position: { x: 0, y: 200 }, data: { label: 'First node' } },
        { id: 'custom2', type: 'custom', position: { x: -200, y: 350 }, data: { label: 'Destination 1' } },
        { id: 'custom3', type: 'custom', position: { x: 200, y: 350 }, data: { label: 'Destination 2' } },
      ],
      edges: [
        { id: 'source->custom1', source: 'source', target: 'custom1' },
        { id: 'custom1->custom2', source: 'custom1', target: 'custom2', animated: true },
        { id: 'custom1->custom3', source: 'custom1', target: 'custom3', animated: true },
        { id: 'custom2->end', source: 'custom2', target: 'end' },
        { id: 'custom3->end', source: 'custom3', target: 'end' },
      ],
      tooltipWrapperStyle: {
        className: 'fixed flex items-end justify-end pointer-events-none',
        style: { right: '170px', bottom: '90px', left: 'auto', top: 'auto' },
      },
    },
    {
      key: 'tooltip6',
      type: 'modal',
      placement: 'top' as TooltipPlacement,
      title: "You're ready!",
      content: <span>Onboarding complete. Happy building!</span>,
      buttonText: 'Start',
      imageUrl: '/langgraph-logo.png',
    },
  ]

  const handleOnboardingNext = () => {
    if (currentOnboardingStep === onboardingSteps.length - 1) {
      localStorage.setItem('initialOnboardingComplete', 'true')
      setInitialOnboardingComplete(true)
    } else {
      setCurrentOnboardingStep((prev) => prev + 1)
    }
  }

  const tooltip = (
    <div className='py-3 px-3 flex flex-col min-w-[300px]'>
      <div className='flex flex-row items-center justify-between'>
        <div className='text-sm font-medium'>{onboardingSteps[currentOnboardingStep].title}</div>
        <button
          onClick={handleOnboardingNext}
          className='text-sm bg-slate-800 hover:bg-slate-900 text-slate-100 py-1 px-2 rounded-md'
        >
          Next
        </button>
      </div>
      <div className='text-sm pt-3'>{onboardingSteps[currentOnboardingStep].content}</div>
    </div>
  )

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes)
    },
    [onNodesChange],
  )

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes)
    },
    [onEdgesChange],
  )

  const onConnectStart: OnConnectStart = useCallback(() => {
    setIsConnecting(true)
  }, [nodes, setIsConnecting])

  const onConnect: OnConnect = useCallback(
    (connection) => {
      const edgeId = `edge-${maxEdgeLength + 1}`
      setMaxEdgeLength((prev) => prev + 1)
      const defaultLabel = `edge_${maxEdgeLength + 1}`
      const newEdge: CustomEdgeType = {
        ...connection,
        id: edgeId,
        markerEnd: { type: MarkerType.ArrowClosed },
        type: 'self-connecting-edge',
        animated: connection.source === connection.target,
        label: defaultLabel,
      }
      setEdges((prevEdges) => {
        const updatedEdges = addEdge(newEdge, prevEdges)
        const sourceEdges = updatedEdges.filter((edge) => edge.source === connection.source)
        if (sourceEdges.length > 1) {
          return updatedEdges.map((edge) =>
            edge.source === connection.source
              ? {
                  ...edge,
                  animated: true,
                  label: defaultLabel || edge.label,
                }
              : edge,
          )
        }
        return updatedEdges
      })
      setIsConnecting(false)
    },
    [setEdges, edges, buttonTexts, updateEdgeLabel, edgeLabels, maxEdgeLength],
  )

  const addNode = useCallback(
    (event: React.MouseEvent) => {
      if (isConnecting) {
        setIsConnecting(false)
        return
      }

      if (reactFlowWrapper) {
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()

        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        })

        const newNode: CustomNodeType = {
          id: `node-${maxNodeLength + 1}`,
          type: 'custom',
          position,
          selected: true,
          data: { label: `Node ${maxNodeLength + 1}` },
        }
        setMaxNodeLength(maxNodeLength + 1)

        setNodes((prevNodes) => {
          return applyNodeChanges(
            [
              {
                type: 'add',
                item: newNode,
              },
            ],
            prevNodes,
          )
        })
      }
    },
    [nodes, setNodes, reactFlowInstance, reactFlowWrapper, isConnecting, applyNodeChanges, maxNodeLength],
  )

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      const isCmdOrCtrlPressed = event.metaKey || event.ctrlKey
      if (isCmdOrCtrlPressed) {
        addNode(event)
      }
    },
    [addNode],
  )

  const handleCodeTypeSelection = (type: 'js' | 'python') => {
    setCodeType(type)
    let generatedCode
    if (type === 'js') {
      generatedCode = generateLanggraphJS(nodes, edges, buttonTexts, edgeLabels)
    } else {
      generatedCode = generateLanggraphCode(nodes, edges, buttonTexts, edgeLabels)
    }

    setGeneratedCode({ code: generatedCode, nodes, edges })
    setGenerateCodeModalOpen(true)
  }

  const copyCodeToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard
        .writeText(generatedCode.code)
        .then(() => {
          alert('Code copied to clipboard!')
        })
        .catch((err) => {
          console.error('Failed to copy code: ', err)
        })
    }
  }

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      const isCmdOrCtrlPressed = event.metaKey || event.ctrlKey
      if (isCmdOrCtrlPressed) {
        setEdges((eds) => eds.map((e) => (e.id === edge.id ? { ...e, animated: !e.animated } : e)))
      }
    },
    [setEdges],
  )

  const flowNodes =
    !initialOnboardingComplete &&
    currentOnboardingStep < onboardingSteps.length &&
    onboardingSteps[currentOnboardingStep].nodes
      ? onboardingSteps[currentOnboardingStep].nodes
      : nodes

  const flowEdges =
    !initialOnboardingComplete &&
    currentOnboardingStep < onboardingSteps.length &&
    onboardingSteps[currentOnboardingStep].edges
      ? onboardingSteps[currentOnboardingStep].edges
      : edges

  return (
    <div ref={reactFlowWrapper} className='z-10 no-scrollbar no-select' style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow<CustomNodeType, CustomEdgeType>
        nodes={flowNodes}
        nodeTypes={nodeTypes}
        onEdgeClick={onEdgeClick}
        onNodesChange={handleNodesChange}
        edges={flowEdges?.map((edge) => ({
          ...edge,
          data: {
            ...edge.data,
          },
        }))}
        edgeTypes={edgeTypes}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        fitView
        onConnectStart={onConnectStart}
        className='z-10 bg-[#EAEAEA]'
        style={{ backgroundColor: '#EAEAEA' }}
        proOptions={proOptions}
        zoomOnDoubleClick={false}
        onPaneClick={handlePaneClick}
      >
        <Background />
      </ReactFlow>

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 bg-gray-100 shadow-xl rounded-md z-20 
          transform transition-transform duration-300
          ${infoPanelOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className='flex flex-col p-6 space-y-5'>
          <div>
            <h2 className='text-xl font-medium'>Key Commands</h2>
          </div>
          <div>
            <p className='text-sm text-slate-800'>Create a node</p>
            <p className='mt-2'>⌘ + click anywhere on the canvas</p>
          </div>
          <div>
            <p className='text-sm text-slate-800'>Create an edge</p>
            <p className='mt-2'>click + drag from the bottom of one node to the top of another</p>
          </div>
          <div>
            <p className='text-sm text-slate-800'>Create a conditional edge</p>
            <p className='mt-2'>connect one node to multiple nodes</p>
          </div>
          <div>
            <p className='text-sm text-slate-800'>Create a cycle</p>
            <p className='mt-2'>click + drag from the bottom to the top of a node</p>
          </div>
          <div>
            <p className='text-sm text-slate-800'>Delete an edge/node</p>
            <p className='mt-2'>click the edge/node and hit the backspace key</p>
          </div>
        </div>
      </div>

      {initialOnboardingComplete === false && currentOnboardingStep < onboardingSteps.length && (
        <div
          className='onboarding-overlay'
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 10,
            cursor: 'not-allowed',
          }}
        >
          {onboardingSteps[currentOnboardingStep].type === 'modal' ? (
            <div className='pointer-events-auto' style={{ cursor: 'default' }}>
              <GenericModal
                isOpen={true}
                onClose={handleOnboardingNext}
                title={onboardingSteps[currentOnboardingStep].title || ''}
                content={<div>{onboardingSteps[currentOnboardingStep].content}</div>}
                buttonText={onboardingSteps[currentOnboardingStep].buttonText || ''}
                imageUrl={onboardingSteps[currentOnboardingStep].imageUrl}
              />
            </div>
          ) : (
            <div
              className={
                onboardingSteps[currentOnboardingStep].tooltipWrapperStyle?.className ||
                'flex items-start justify-center'
              }
              style={onboardingSteps[currentOnboardingStep].tooltipWrapperStyle?.style || { paddingTop: '30vh' }}
            >
              <Tooltip
                className='pointer-events-auto'
                arrow
                modifiers={[
                  {
                    name: 'offset',
                    options: {
                      offset: [0, 20],
                    },
                  },
                ]}
                color='neutral'
                variant='outlined'
                placement={onboardingSteps[currentOnboardingStep].placement || 'top'}
                title={tooltip}
                open={true}
                sx={{ cursor: 'default' }}
              >
                <div></div>
              </Tooltip>
            </div>
          )}
        </div>
      )}

      <MuiModal
        hideBackdrop={true}
        onClose={() => {
          setGenerateCodeModalOpen(false)
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setGenerateCodeModalOpen(false)
          }
        }}
        open={generateCodeModalOpen}
      >
        <ModalDialog className='bg-slate-150 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
          <div className='w-[800px] max-h-[80vh] flex flex-col'>
            <div className='flex justify-between items-center'>
              <h2 className='text-lg font-bold'>Generated Code:</h2>
              <div className='flex flex-row gap-2'>
                <button
                  className='bg-[#246161] hover:bg-[#195656] text-white font-bold px-2 py-2 rounded'
                  onClick={copyCodeToClipboard}
                >
                  <Copy />
                </button>
                <button
                  className='bg-[#FF5C5C] hover:bg-[#E25252] text-white font-bold px-2 rounded'
                  onClick={() => {
                    setGenerateCodeModalOpen(false)
                  }}
                >
                  <X />
                </button>
              </div>
            </div>
            <div className='mt-6 overflow-auto flex-1'>
              <Highlight
                theme={themes.nightOwl}
                code={generatedCode?.code || ''}
                language={codeType === 'python' ? 'python' : 'javascript'}
              >
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                  <pre className='p-3 rounded-md' style={style}>
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })}>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            </div>
            <div className='flex justify-center mt-3 border-t border-gray-200'>
              <div className='flex flex-row gap-2 pt-3'>
                <button
                  className={`py-2 px-2 rounded-md ${codeType === 'python' ? 'bg-[#246161]' : 'bg-[#A3CCCC]'}`}
                  onClick={() => handleCodeTypeSelection('python')}
                >
                  <Image src='/python.png' alt='Python' width={35} height={35} />
                </button>
                <button
                  className={`py-2 px-2 rounded-md ${codeType === 'python' ? 'bg-[#A3CCCC]' : 'bg-[#246161]'}`}
                  onClick={() => handleCodeTypeSelection('js')}
                >
                  <Image src='/javascript.png' alt='JS' width={35} height={35} />
                </button>
              </div>
            </div>
          </div>
        </ModalDialog>
      </MuiModal>

      <div className='fixed bottom-16 left-5 flex flex-row gap-2'>
        <button
          className='text-white p-3 rounded-md shadow-lg bg-[#2F6868] hover:bg-[#245757] focus:outline-none'
          aria-label='Toggle Information Panel'
          onClick={() => setInfoPanelOpen(!infoPanelOpen)}
        >
          <Info className='h-6 w-6' />
        </button>
      </div>

      <div className='flex rounded flex-col absolute bottom-16 right-5'>
        <button
          className='bg-[#2F6868] hover:bg-[#245757] py-2 px-3 rounded-md'
          onClick={() => handleCodeTypeSelection('python')}
        >
          <div className='text-[#333333] font-medium text-center text-slate-100'> {'Generate Code'}</div>
        </button>
      </div>
    </div>
  )
}
