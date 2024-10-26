'use client'
import Image from 'next/image'
import { useCallback, useState, useEffect, useRef } from 'react'
import Toolbar from './ToolBar'
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
import { ActiveIconProvider } from '@/contexts/ActiveIconContext'
import { initialNodes, nodeTypes, type CustomNodeType } from './nodes'
import { initialEdges, edgeTypes, type CustomEdgeType } from './edges'
import { generateLanggraphCode } from '../codeGeneration/generateLanggraph'
import { generateLanggraphJS } from '../codeGeneration/generateLanggraphJS'
import { CodeGenerationResult } from '../codeGeneration/types'
import { useButtonText } from '@/contexts/ButtonTextContext'
import { useEdgeLabel } from '@/contexts/EdgeLabelContext'
import { Button, Modal as MuiModal, ModalDialog } from '@mui/joy'

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
  const [activeIcon, setActiveIcon] = useState<number>(0)
  const activeIconRef = useRef(activeIcon)
  const [isLocked, setIsLocked] = useState(false)
  const isLockedRef = useRef(isLocked)
  const [currentModalIndex, setCurrentModalIndex] = useState<number | null>(null)

  const modalActiveIconMap: { [key: string]: number } = {
    welcomeModal: 0,
    toolBarModal: 0,
    createNodeModal: 0,
    createEdgeModal: 2,
    conditionalEdgeModal: 2,
    eraseModal: 3,
    moveAroundModal: 1,
    generateCodeModal: 0,
  }

  useEffect(() => {
    const storedActiveIcon = Number(localStorage.getItem('activeIcon'))
    if (!isNaN(storedActiveIcon)) {
      setActiveIcon(storedActiveIcon)
    }
  }, [])

  useEffect(() => {
    activeIconRef.current = activeIcon
    isLockedRef.current = isLocked
    localStorage.setItem('activeIcon', activeIcon.toString())
  }, [activeIcon, isLocked])

  useEffect(() => {
    if (activeIconRef.current === 5) {
      handleCodeTypeSelection('js')
    } else if (activeIconRef.current === 4) {
      handleCodeTypeSelection('python')
    }
  }, [activeIcon])

  const handleNodesChange = useCallback(
    (changes: any) => {
      if (activeIconRef.current !== 3 && changes[0].type === 'remove') {
        console.log('onNodesChange prevented because activeIcon is 1')
        return
      }
      onNodesChange(changes)
    },
    [onNodesChange],
  )

  const handleEdgesChange = useCallback(
    (changes: any) => {
      console.log('changes')
      // If the active icon is not 3 (i.e., not in eraser mode), prevent deletion
      if (activeIconRef.current !== 3 && changes.some((change: any) => change.type === 'remove')) {
        console.log('Edge deletion prevented because activeIcon is not 3')
        return
      }

      onEdgesChange(changes)
    },
    [onEdgesChange],
  )

  const isNodeOneCreated = nodes.length > 2
  const isEdgeOneCreated = edges.length > 0
  const isConditionalEdgeCreated = edges.filter((edge) => edge.animated).length > 0

  useEffect(() => {
    const modalsDismissed = [
      localStorage.getItem('welcomeModalDismissed') === 'true',
      localStorage.getItem('toolBarModalDismissed') === 'true',
      localStorage.getItem('createNodeModalDismissed') === 'true',
      localStorage.getItem('createEdgeModalDismissed') === 'true',
      localStorage.getItem('conditionalEdgeModalDismissed') === 'true',
      localStorage.getItem('eraseModalDismissed') === 'true',
      localStorage.getItem('moveAroundModalDismissed') === 'true',
      localStorage.getItem('generateCodeModalDismissed') === 'true',
    ]

    const initialIndex = modalsDismissed.findIndex((dismissed) => !dismissed)
    setCurrentModalIndex(initialIndex >= 0 ? initialIndex : genericModalArray.length)

    if (initialIndex >= 0 && initialIndex < genericModalArray.length) {
      const currentModalKey = genericModalArray[initialIndex].key
      const newActiveIcon = modalActiveIconMap[currentModalKey] ?? 0
      setActiveIcon(newActiveIcon)
    } else {
      setActiveIcon(0)
    }
  }, [])

  const handleModalClose = () => {
    const currentModal = genericModalArray[currentModalIndex || 0]

    switch (currentModal.key) {
      case 'welcomeModal':
        localStorage.setItem('welcomeModalDismissed', 'true')
        break
      case 'toolBarModal':
        localStorage.setItem('toolBarModalDismissed', 'true')
        break
      case 'createNodeModal':
        if (!isNodeOneCreated) {
          alert('Please create a node before continuing!')
          return
        }
        localStorage.setItem('createNodeModalDismissed', 'true')
        setActiveIcon(modalActiveIconMap['createEdgeModal'])
        break
      case 'createEdgeModal':
        if (!isEdgeOneCreated) {
          alert('Please create an edge before continuing!')
          return
        }
        localStorage.setItem('createEdgeModalDismissed', 'true')
        break
      case 'conditionalEdgeModal':
        if (!isConditionalEdgeCreated) {
          alert('Please create a conditional edge before continuing!')
          return
        }
        localStorage.setItem('conditionalEdgeModalDismissed', 'true')
        setActiveIcon(modalActiveIconMap['eraseModal'])
        break
      case 'eraseModal':
        localStorage.setItem('eraseModalDismissed', 'true')
        setActiveIcon(modalActiveIconMap['moveAroundModal'])
        break
      case 'moveAroundModal':
        localStorage.setItem('moveAroundModalDismissed', 'true')
        setActiveIcon(modalActiveIconMap['generateCodeModal'])
        break
      case 'generateCodeModal':
        localStorage.setItem('generateCodeModalDismissed', 'true')
        break
      default:
        break
    }
    setCurrentModalIndex((prevIndex) => (prevIndex !== null ? prevIndex + 1 : null))
  }

  const genericModalArray = [
    {
      key: 'welcomeModal',
      noClickThrough: true,
      imageUrl: '/langgraph-logo.png',
      onClose: handleModalClose,
      title: 'Graph Builder',
      content: (
        <span>
          Use this tool to quickly prototype the architecture of your agent. If you're new to LangGraph, check out our
          docs{' '}
          <a
            style={{ textDecoration: 'underline' }}
            href='https://langchain-ai.github.io/langgraph/tutorials/introduction/'
            target='_blank'
            rel='noopener noreferrer'
          >
            here
          </a>
        </span>
      ),
      buttonText: 'Get Started',
    },
    {
      key: 'toolBarModal',
      hideBackDrop: true,
      onClose: handleModalClose,
      className: 'absolute top-1/2 left-10 transform -translate-y-1/2',
      title: 'Tool bar',
      content:
        "You'll toggle between the tools at the top of your screen to build the graph. Let's start with the first one",
      buttonText: 'Continue',
    },
    {
      key: 'createNodeModal',
      hideBackDrop: true,
      className: 'absolute top-1/2 left-10 transform -translate-y-1/2',
      onClose: handleModalClose,
      title: 'Create a node',
      content: 'To create a node, click anywhere on the screen. Click and drag to move it around',
      buttonText: 'Continue',
    },
    {
      key: 'createEdgeModal',
      hideBackDrop: true,
      className: 'absolute top-1/2 left-10 transform -translate-y-1/2',

      onClose: handleModalClose,
      title: 'Create a normal edge',
      content: 'The next tool helps you create edges. To create a normal edge, click and drag from one node to another',
      buttonText: 'Continue',
    },
    {
      key: 'conditionalEdgeModal',
      hideBackDrop: true,

      className: 'absolute top-1/2 left-10 transform -translate-y-1/2',
      onClose: handleModalClose,
      title: 'Create a conditional edge',
      content: 'To create a conditional edge, click on a normal edge or draw multiple edges leaving from the same node',
      buttonText: 'Continue',
    },
    {
      key: 'eraseModal',
      hideBackDrop: true,
      className: 'absolute top-1/2 left-10 transform -translate-y-1/2',
      onClose: handleModalClose,
      title: 'Delete a node or edge',
      content:
        'Our next tool helps us clean up the graph. Double click on an edge to delete it. Select a node and press delete to remove it',
      buttonText: 'Continue',
    },
    {
      key: 'moveAroundModal',
      hideBackDrop: true,
      className: 'absolute top-1/2 left-10 transform -translate-y-1/2',
      onClose: handleModalClose,
      title: 'Lock the graph',
      content:
        "This tool locks the graph. In this mode, you can move nodes around but you can't create or edit nodes and edges",
      buttonText: 'Continue',
    },
    {
      key: 'generateCodeModal',
      hideBackDrop: true,

      onClose: handleModalClose,
      title: 'Happy building!',
      content: "Once you're done prototyping, click either the Python or JS logo to get code based on your graph",
      buttonText: 'Finish',
    },
  ]

  const isOnboarding = currentModalIndex !== null && currentModalIndex < genericModalArray.length

  // util functions
  const onConnectStart: OnConnectStart = useCallback(() => {
    setIsConnecting(true)
  }, [nodes, setIsConnecting])

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (activeIconRef.current === 1 || activeIconRef.current === 0 || activeIconRef.current === 3) {
        return
      }
      const edgeId = `edge-${maxEdgeLength + 1}`
      setMaxEdgeLength(maxEdgeLength + 1)
      const defaultLabel = `default_edge_name`
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
    },
    [setEdges, edges, buttonTexts, updateEdgeLabel, edgeLabels, maxEdgeLength],
  )

  const addNode = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()

      if (activeIconRef.current === 1 || activeIconRef.current === 2 || activeIconRef.current === 3) {
        return
      }
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
      event.stopPropagation()
      if (activeIconRef.current === 1 || activeIconRef.current === 0 || isLockedRef.current) {
        return
      }

      setEdges((eds) => eds.map((e) => (e.id === edge.id ? { ...e, animated: !e.animated } : e)))
    },
    [setEdges],
  )

  const onEdgeDoubleClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation()
      if (activeIconRef.current !== 3 || isLockedRef.current) {
        return
      }
      setEdges((eds) => eds.filter((e) => e.id !== edge.id))
    },
    [setEdges],
  )

  return (
    <div>
      <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 md:hidden flex flex-col justify-center items-center text-lg font-medium text-center'>
        <div className={`flex justify-center mb-6`}>
          <Image src={'/langgraph-logo.png'} alt='Modal Image' width={150} height={150} />
        </div>
        <h1>Please view the LangGraph Builder on desktop</h1>
      </div>
      <div
        ref={reactFlowWrapper}
        className='z-10 no-scrollbar hidden md:block'
        style={{ width: '100vw', height: '100vh' }}
      >
        <ActiveIconProvider activeIcon={activeIcon}>
          <ReactFlow<CustomNodeType, CustomEdgeType>
            onEdgeClick={onEdgeClick}
            onEdgeDoubleClick={onEdgeDoubleClick}
            nodes={nodes}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            edges={edges.map((edge) => {
              return {
                ...edge,
                data: { ...edge.data },
              }
            })}
            edgeTypes={edgeTypes}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            fitView
            onConnectStart={onConnectStart}
            onPaneClick={addNode}
            className='z-10 bg-[#1a1c24]'
            style={{
              backgroundColor: '#1a1c24',
            }}
            proOptions={proOptions}
            connectionLineStyle={{ opacity: activeIcon === 1 || activeIcon === 0 || activeIcon === 3 ? 0 : 1 }}
          >
            <Background />
          </ReactFlow>
        </ActiveIconProvider>

        <Toolbar
          setActiveIcon={setActiveIcon}
          activeIcon={activeIcon}
          setIsLocked={setIsLocked}
          isLocked={isLocked}
          disabled={isOnboarding}
        />

        {currentModalIndex !== null && currentModalIndex < genericModalArray.length && (
          <GenericModal
            isOpen={currentModalIndex < genericModalArray.length}
            {...genericModalArray[currentModalIndex]}
          />
        )}
        <MuiModal
          hideBackdrop={true}
          onClose={() => {
            setGenerateCodeModalOpen(false)
          }}
          open={generateCodeModalOpen}
        >
          <ModalDialog className='bg-slate-150 absolute top-1/2 left-10 transform -translate-y-1/2'>
            <div className='flex justify-between items-center'>
              <h2 className='text-lg font-bold'>Generated Code:</h2>
              <Button
                className='bg-[#246161] hover:bg-[#195656] text-white font-bold px-2 rounded w-28'
                onClick={copyCodeToClipboard}
              >
                Copy Code
              </Button>
            </div>
            <div className='overflow-y-scroll overflow-x-scroll justify-center'>
              <pre className='py-6 px-3'>
                <code>{generatedCode?.code}</code>
              </pre>
            </div>
            <div className='flex justify-center'>
              <Button
                className='bg-[#FF7F7F] hover:bg-[#FF5C5C] text-white font-bold px-2 rounded w-20'
                onClick={() => {
                  setGenerateCodeModalOpen(false)
                  setActiveIcon(0)
                }}
              >
                Close
              </Button>
            </div>
          </ModalDialog>
        </MuiModal>
      </div>
    </div>
  )
}
