'use client'
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
import { CodeGenerationResult } from '../codeGeneration/types'
import { useButtonText } from '@/contexts/ButtonTextContext'
import { useEdgeLabel } from '@/contexts/EdgeLabelContext'
import { Modal as MuiModal, ModalDialog, Tooltip } from '@mui/joy'
import { X, Copy, Info, Check } from 'lucide-react'
import { Highlight, themes } from 'prism-react-renderer'
import MultiButton from './ui/multibutton'

import GenericModal from './GenericModal'

// Loading spinner component
const LoadingSpinner = () => (
  <div className='flex items-center justify-center'>
    <div className='w-12 h-12 border-4 border-[#2F6868] border-t-transparent rounded-full animate-spin'></div>
  </div>
)

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
  const [activeFile, setActiveFile] = useState<'stub' | 'implementation'>('stub')
  const [generatedFiles, setGeneratedFiles] = useState<{ stub?: string; implementation?: string }>({})
  const [language, setLanguage] = useState<'python' | 'typescript'>('python')

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const [initialOnboardingComplete, setInitialOnboardingComplete] = useState<boolean | null>(null)
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [infoPanelOpen, setInfoPanelOpen] = useState(false)
  const [justCopied, setJustCopied] = useState(false)

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
        { id: 'custom1', type: 'custom', position: { x: 0, y: 200 }, data: { label: 'Supervisor' } },
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
        { id: 'custom1', type: 'custom', position: { x: 0, y: 200 }, data: { label: 'Supervisor' } },
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
        { id: 'custom1', type: 'custom', position: { x: 0, y: 200 }, data: { label: 'Supervisor' } },
        { id: 'custom2', type: 'custom', position: { x: -200, y: 350 }, data: { label: 'RAG' } },
        { id: 'custom3', type: 'custom', position: { x: 200, y: 350 }, data: { label: 'Web Search' } },
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
      placement: 'bottom' as TooltipPlacement,
      title: '4 of 4: Generate Code',
      content:
        "Once you're finished designing the architecture of your graph, you can generate boilerplate code for the agent using this button",
      nodes: [
        { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: { label: 'source' } },
        { id: 'end', type: 'end', position: { x: 0, y: 600 }, data: { label: 'end' } },
        { id: 'custom1', type: 'custom', position: { x: 0, y: 200 }, data: { label: 'Supervisor' } },
        { id: 'custom2', type: 'custom', position: { x: -200, y: 350 }, data: { label: 'RAG' } },
        { id: 'custom3', type: 'custom', position: { x: 200, y: 350 }, data: { label: 'Web Search' } },
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
        style: { right: '190px', top: '90px', left: 'auto', bottom: 'auto' },
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
      const defaultLabel = `conditional_edge`
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

  function generateSpec(edges: any): string {
    // Step 1: Separate normal edges and animated edges, ensure animated is treated as false when undefined
    const normalEdges: any[] = edges.filter((edge: any) => !edge.animated && edge.animated !== undefined)
    const animatedEdges: any[] = edges.filter((edge: any) => edge.animated === true)

    // Step 2: Group animated edges by source
    const animatedEdgesBySource: Record<string, Edge[]> = {}
    animatedEdges.forEach((edge) => {
      if (!animatedEdgesBySource[edge.source]) {
        animatedEdgesBySource[edge.source] = []
      }
      animatedEdgesBySource[edge.source].push(edge)
    })

    // Step 3: Build nodes list (unique nodes from all edges)
    const nodeNames: Set<string> = new Set()
    edges.forEach((edge: any) => {
      nodeNames.add(edge.source)
      nodeNames.add(edge.target)
    })

    // Step 4: Build YAML structure
    const yaml = {
      name: 'CustomAgent',
      entrypoint: 'source',
      nodes: Array.from(nodeNames).map((name) => ({ name })),
      edges: [
        ...normalEdges.map((edge) => ({
          from: edge.source,
          to: edge.target,
        })),
        ...Object.entries(animatedEdgesBySource).map(([source, edges]) => ({
          from: source,
          condition: String(edges[0].label || ''),
          paths: edges.reduce(
            (acc, edge) => ({
              ...acc,
              [edge.id]: edge.target,
            }),
            {},
          ),
        })),
      ],
    }

    // Convert to YAML string
    return Object.entries(yaml)
      .map(([key, value]) => {
        if (key === 'nodes') {
          // @ts-ignore
          return `${key}:\n${value.map((node: any) => `  - name: ${node.name}`).join('\n')}`
        }
        if (key === 'edges') {
          return `${key}:\n${value
            // @ts-ignore
            .map((edge: any) => {
              if ('condition' in edge) {
                return `  - from: ${edge.from}\n    condition: ${edge.condition}\n    paths:\n${Object.entries(
                  edge.paths,
                )
                  .map(([key, value]) => `      ${key}: ${value}`)
                  .join('\n')}`
              }
              return `  - from: ${edge.from}\n    to: ${edge.to}`
            })
            .join('\n')}`
        }
        return `${key}: ${value}`
      })
      .join('\n')
  }

  const handleLanguageChange = async (option: string) => {
    const newLanguage = option.toLowerCase() as 'python' | 'typescript'
    setLanguage(newLanguage)
    if (generatedFiles.stub || generatedFiles.implementation) {
      await generateCodeWithLanguage(newLanguage)
    }
  }

  const generateCodeWithLanguage = async (lang: 'python' | 'typescript' = language) => {
    try {
      setIsLoading(true)
      setGenerateCodeModalOpen(true)
      const spec = generateSpec(edges)
      const payload = {
        spec: spec,
        language: lang,
        format: 'yaml',
      }
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      setGeneratedFiles({
        stub: data.stub,
        implementation: data.implementation,
      })
      setActiveFile('stub')
    } catch (error) {
      console.error('Failed to generate code:', error)
      setGeneratedFiles({})
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateCode = () => {
    generateCodeWithLanguage('python')
  }

  const activeCode = generatedFiles[activeFile] || ''
  const fileExtension = language === 'python' ? '.py' : '.ts'

  // New helper to copy active code to the clipboard
  const copyActiveCode = () => {
    if (activeCode) {
      navigator.clipboard
        .writeText(activeCode)
        .then(() => {
          setJustCopied(true)
          setTimeout(() => setJustCopied(false), 1500)
        })
        .catch((err) => console.error('Failed to copy code: ', err))
    }
  }

  return (
    <div ref={reactFlowWrapper} className='no-scrollbar no-select' style={{ width: '100vw', height: '100vh' }}>
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
          <div className='flex flex-col'>
            <div className='flex justify-between items-center'>
              <h2 className='text-lg font-medium'>Generated Code:</h2>
              <div className='flex flex-row gap-2'>
                <div className='max-w-xs pr-3'>
                  <MultiButton onSelectionChange={(option) => handleLanguageChange(option)} />
                </div>
                <button
                  className='font-bold pr-3 text-gray-300 hover:text-gray-600 transition-colors duration-300 ease-in-out'
                  onClick={() => {
                    setGenerateCodeModalOpen(false)
                  }}
                >
                  <X size={30} />
                </button>
              </div>
            </div>
            <div className='flex flex-col gap-3'>
              {!isLoading && (generatedFiles.stub || generatedFiles.implementation) ? (
                <div className='mt-3 w-[50vw] h-[80vh]'>
                  <div className='flex'>
                    <button
                      className={`px-3 rounded-t-md py-1 ${activeFile === 'stub' ? 'bg-[#246161] text-white' : 'bg-gray-200'}`}
                      onClick={() => setActiveFile('stub')}
                    >
                      {`stub${fileExtension}`}
                    </button>
                    <button
                      className={`px-3 rounded-t-md ${activeFile === 'implementation' ? 'bg-[#246161] text-white' : 'bg-gray-200'}`}
                      onClick={() => setActiveFile('implementation')}
                    >
                      {`implementation${fileExtension}`}
                    </button>
                  </div>
                  <div className='relative bg-gray-100 overflow-hidden h-[calc(80vh-30px)]'>
                    <button
                      onClick={copyActiveCode}
                      className='absolute top-2 right-6 z-10 p-1 bg-white rounded border border-gray-300 hover:bg-gray-50'
                      title='Copy code to clipboard'
                    >
                      {justCopied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                    <Highlight
                      theme={themes.nightOwl}
                      code={activeCode || ''}
                      language={language === 'python' ? 'python' : 'typescript'}
                    >
                      {({ style, tokens, getLineProps, getTokenProps }) => (
                        <pre className='p-3 overflow-auto h-full max-h-full' style={{ ...style, height: '100%' }}>
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
                </div>
              ) : (
                <div className='mt-3 w-[50vw] h-[80vh] flex items-center justify-center'>
                  <div className='flex flex-col items-center gap-4'>
                    <LoadingSpinner />
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalDialog>
      </MuiModal>
      <div className='fixed top-[24px] right-[24px] flex flex-row gap-2'>
        <div className='flex flex-row gap-2'>
          <Tooltip title={edges.length === 0 ? 'Create an edge to generate code' : ''} placement='bottom' arrow>
            <button
              className={`py-2 px-3 rounded-md transition-colors duration-200 ${
                edges.length > 0 ? 'bg-[#2F6868] cursor-pointer hover:bg-[#245757]' : 'bg-gray-500 opacity-70'
              }`}
              onClick={edges.length > 0 ? handleGenerateCode : undefined}
              disabled={edges.length === 0}
            >
              <div className='text-[#333333] font-medium text-center text-slate-100'> {'Generate Code'}</div>
            </button>
          </Tooltip>
          <button
            className='p-3 rounded-md shadow-lg border border-[#2F6868] text-[#2F6868] focus:outline-none'
            aria-label='Toggle Information Panel'
            onClick={() => setInfoPanelOpen(!infoPanelOpen)}
          >
            <Info className='h-6 w-6' />
          </button>
        </div>
      </div>
    </div>
  )
}
