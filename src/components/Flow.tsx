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
import { Modal as MuiModal, ModalDialog, Snackbar } from '@mui/joy'
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
  const [initialOnboardingComplete, setInitialOnboardingComplete] = useState(false)
  const [isAdditionalOnboarding, setIsAdditionalOnboarding] = useState(false)
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0)
  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
  }, [nodes, edges])

  const handlePreviousStep = () => {
    setCurrentOnboardingStep((prevStep) => Math.max(prevStep - 1, 0))
  }

  const handleFinishOnboarding = () => {
    setIsAdditionalOnboarding(false)
    setCurrentOnboardingStep(0)
  }
  const startOnboarding = () => {
    if (isAdditionalOnboarding) {
      setIsAdditionalOnboarding(false)
    } else {
      setCurrentOnboardingStep(0)
      setIsAdditionalOnboarding(true)
    }
  }

  useEffect(() => {
    const initialComplete = localStorage.getItem('initialOnboardingComplete') === 'true'
    setInitialOnboardingComplete(initialComplete)

    if (!initialComplete) {
      setCurrentOnboardingStep(0)
    }
  }, [])

  const handleInitialModalClose = () => {
    setInitialOnboardingComplete(true)
    localStorage.setItem('initialOnboardingComplete', 'true')
    setCurrentOnboardingStep(0)
  }

  const handleNextStep = () => {
    setCurrentOnboardingStep((prevStep) => {
      const nextStep = prevStep + 1
      if (nextStep < additionalModalArray.length) {
        return nextStep
      } else {
        setIsAdditionalOnboarding(false)
        localStorage.setItem('additionalOnboardingComplete', 'true')
        return prevStep
      }
    })
  }

  const initialModalArray = [
    {
      key: 'welcomeModal',
      noClickThrough: true,
      imageUrl: '/langgraph-logo.png',
      onClose: () => handleInitialModalClose(),
      title: 'Graph Builder',
      content: (
        <span>
          Use this tool to quickly prototype the architecture of your agent. If you're new to LangGraph, check out our{' '}
          <a
            style={{ textDecoration: 'underline' }}
            href='https://langchain-ai.github.io/langgraph/tutorials/introduction/'
            target='_blank'
            rel='noopener noreferrer'
          >
            docs
          </a>
        </span>
      ),
      buttonText: 'Get Started',
    },
  ]

  const additionalModalArray = [
    {
      key: 'step1',
      hideBackDrop: true,
      onClose: () => handleNextStep(),
      title: 'Create a Node',
      content: 'To create a node, ⌘ + Click anywhere on the screen. Click and drag to move the node around.',
      buttonText: 'Next',
      showBack: false,
    },
    {
      key: 'step2',
      hideBackDrop: true,
      onClose: () => handleNextStep(),
      title: 'Create a Normal Edge',
      content: 'Click and drag from one node to another to create a normal edge.',
      buttonText: 'Next',
      showBack: true,
    },
    {
      key: 'step3',
      hideBackDrop: true,
      onClose: () => handleNextStep(),
      title: 'Create a Conditional Edge',
      content:
        '⌘ + Click a normal edge or draw multiple edges leaving from the same node to create a conditional edge.',
      buttonText: 'Next',
      showBack: true,
    },
    {
      key: 'step4',
      hideBackDrop: true,
      onClose: () => handleNextStep(),
      title: 'Delete a Node or Edge',
      content: 'To delete a node or edge, just click + ⌫.',
      buttonText: 'Next',
      showBack: true,
    },
    {
      key: 'step5',
      hideBackDrop: true,
      onClose: () => handleFinishOnboarding(),
      title: 'Happy Building!',
      content: "Once you're done prototyping, click either the Python or JS logo to get code based on your graph.",
      buttonText: 'Finish',
      showBack: true,
    },
  ]

  const isLastStep = currentOnboardingStep === additionalModalArray.length - 1

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
      const defaultLabel = `edge-${maxEdgeLength + 1}`
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
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        open={snackbarOpen}
        onClose={(_, reason) => {
          if (reason === 'clickaway') {
            return
          }
          setSnackbarOpen(false)
        }}
        key='bottom-right'
        className='max-w-sm shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-3 border-slate-600'
        autoHideDuration={6000}
      >
        <div className='flex border-gray-200'>
          <button
            type='button'
            className='border border-transparent rounded-none rounded-r-lg p-3 flex items-center justify-center text-gray-400 hover:text-gray-500 focus:outline-none'
            onClick={() => setSnackbarOpen(false)}
          >
            <X className='h-5 w-5' aria-hidden='true' />
          </button>
        </div>
      </Snackbar>

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

        <GenericModal
          isOpen={!initialOnboardingComplete}
          onClose={initialModalArray[0].onClose}
          title={initialModalArray[0].title}
          content={<div>{initialModalArray[0].content}</div>}
          buttonText={initialModalArray[0].buttonText}
          imageUrl={initialModalArray[0].imageUrl}
        />

        {isAdditionalOnboarding && (
          <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'
            onClick={() => setIsAdditionalOnboarding(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className='fixed w-full md:max-w-lg text-center bg-white rounded-lg z-50 flex items-center justify-center top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
            >
              <div className='flex flex-row gap-5 py-8 px-5'>
                <button
                  disabled={currentOnboardingStep === 0}
                  className='disabled:text-gray-300 z-50'
                  onClick={handlePreviousStep}
                >
                  <ChevronLeft className='h-10 w-10' />
                </button>
                <div className='flex flex-col gap-2'>
                  <div className='text-xl md:text-2xl font-medium'>
                    {additionalModalArray[currentOnboardingStep].title}
                  </div>
                  <div className='text-sm md:text-lg text-gray-500 pt-2 text-center'>
                    {additionalModalArray[currentOnboardingStep].content}
                  </div>
                </div>
                <button className='disabled:text-gray-300' disabled={isLastStep} onClick={handleNextStep}>
                  <ChevronRight className='h-10 w-10' />
                </button>
              </div>
            </div>
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

        <div className='fixed bottom-20 left-5 flex flex-row gap-2'>
          <button
            className='text-white p-3 rounded-md shadow-lg bg-[#2F6868] hover:bg-[#245757] focus:outline-none'
            onClick={startOnboarding}
            aria-label='Toggle Information Panel'
          >
            <Info className='h-6 w-6' />
          </button>
        </div>

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
