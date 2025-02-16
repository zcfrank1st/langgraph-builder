'use client'
import Image from 'next/image'
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
import { Modal as MuiModal, ModalDialog, Snackbar, Button, Tooltip } from '@mui/joy'
import { X, Info, ChevronLeft, ChevronRight } from 'lucide-react'

import GenericModal from './GenericModal'

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
  const [snackbarOpen, setSnackbarOpen] = useState(false)

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const [initialOnboardingComplete, setInitialOnboardingComplete] = useState<boolean>(false)
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0)

  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
  }, [nodes, edges])

  useEffect(() => {
    const initialComplete = localStorage.getItem('initialOnboardingComplete') === 'true'
    setInitialOnboardingComplete(initialComplete)
  }, [])

  console.log(currentOnboardingStep, 'currentOnboardingStep')
  const onboardingSteps = [
    {
      key: 'welcomeModal',
      type: 'modal',
      title: 'Graph Builder',
      content: <span>Use this tool to quickly prototype the architecture of your agentic application</span>,
      buttonText: 'Get Started',
      imageUrl: '/langgraph-logo.png',
    },
    {
      key: 'tooltip1',
      type: 'tooltip',
      title: '1 of 4: Create a Node',
      content: '⌘ + click to create a node on the canvas',
    },
    {
      key: 'tooltip2',
      type: 'tooltip',
      content: 'Add new nodes by holding Cmd/Ctrl and clicking on the background.',
      position: { top: '60%', left: '10%' },
    },
    {
      key: 'tooltip3',
      type: 'tooltip',
      content: 'Connect nodes by dragging from one node to another.',
      position: { top: '50%', left: '70%' },
    },
    {
      key: 'tooltip4',
      type: 'tooltip',
      content: 'Generate code using the buttons on the bottom right.',
      position: { top: '80%', left: '50%' },
    },
  ]

  const handleOnboardingNext = () => {
    if (currentOnboardingStep === onboardingSteps.length - 1) {
      localStorage.setItem('initialOnboardingComplete', 'true')
      setInitialOnboardingComplete(true)
      setCurrentOnboardingStep(onboardingSteps.length)
    } else {
      setCurrentOnboardingStep((prev) => prev + 1)
    }
  }

  const tooltip = (
    <div className='py-3 px-3 flex flex-col'>
      <div className='text-sm font-medium'>{onboardingSteps[currentOnboardingStep].title}</div>
      <div className='text-sm pt-2'>{onboardingSteps[currentOnboardingStep].content}</div>
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

  return (
    <div>
      <div ref={reactFlowWrapper} className='z-10 no-scrollbar no-select' style={{ width: '100vw', height: '100vh' }}>
        <ReactFlow<CustomNodeType, CustomEdgeType>
          nodes={nodes}
          nodeTypes={nodeTypes}
          onEdgeClick={onEdgeClick}
          onNodesChange={handleNodesChange}
          edges={edges.map((edge) => {
            return {
              ...edge,
              data: {
                ...edge.data,
              },
            }
          })}
          edgeTypes={edgeTypes}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          fitView
          onConnectStart={onConnectStart}
          className='z-10 bg-[#EAEAEA]'
          style={{
            backgroundColor: '#EAEAEA',
          }}
          proOptions={proOptions}
          zoomOnDoubleClick={false}
          onPaneClick={handlePaneClick}
        >
          <Background />
        </ReactFlow>

        {!initialOnboardingComplete && currentOnboardingStep < onboardingSteps.length && (
          <div className='onboarding-overlay'>
            {onboardingSteps[currentOnboardingStep].type === 'modal' ? (
              <GenericModal
                isOpen={true}
                onClose={handleOnboardingNext}
                title={onboardingSteps[currentOnboardingStep].title || ''}
                content={<div>{onboardingSteps[currentOnboardingStep].content}</div>}
                buttonText={onboardingSteps[currentOnboardingStep].buttonText || ''}
                imageUrl={onboardingSteps[currentOnboardingStep].imageUrl}
              />
            ) : (
              <div
                className='fixed inset-0 flex items-start justify-center pointer-events-none'
                style={{ paddingTop: '28vh' }}
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
                  placement='left'
                  title={tooltip}
                  open={true}
                >
                  <div>node or edge</div>
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
          <ModalDialog className='bg-slate-150 absolute top-1/2 left-10 transform -translate-y-1/2'>
            <div className='flex justify-between items-center'>
              <h2 className='text-lg font-bold'>Generated Code:</h2>
              <div className='flex flex-row gap-2'>
                <button
                  className='bg-[#246161] hover:bg-[#195656] text-white font-bold px-2 py-2 rounded w-28'
                  onClick={copyCodeToClipboard}
                >
                  Copy Code
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
            <div className='overflow-y-scroll overflow-x-scroll justify-center'>
              <pre className='py-6 px-3'>
                <code>{generatedCode?.code}</code>
              </pre>
            </div>
            <div className='flex justify-center'></div>
          </ModalDialog>
        </MuiModal>

        <div className='flex rounded py-2 px-4 flex-col absolute bottom-16 right-5'>
          <div className='text-[#333333] font-medium text-center'> {'Generate Code'}</div>
          <div className='flex flex-row gap-2 pt-3'>
            <button
              className='bg-[#2F6868] hover:bg-[#245757] py-2 px-2 rounded-md'
              onClick={() => handleCodeTypeSelection('python')}
            >
              <Image src='/python.png' alt='Python' width={35} height={35} />
            </button>
            <button
              className='bg-[#2F6868] hover:bg-[#245757] py-2 px-2 rounded-md'
              onClick={() => handleCodeTypeSelection('js')}
            >
              <Image src='/javascript.png' alt='JS' width={35} height={35} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
