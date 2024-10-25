'use client'
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

  useEffect(() => {
    activeIconRef.current = activeIcon
    isLockedRef.current = isLocked
    isLockedRef.current = isLocked
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
  // onboarding logic
  const [modals, setModals] = useState({
    showWelcomeModal: false,
    showCreateNodeModal: false,
    showCreateEdgeModal: false,
    showConditionalEdgeModal: false,
    showRenameModal: false,
    showGenerateCodeModal: false,
  })

  const isNodeOneCreated = nodes.length > 2
  const isEdgeOneCreated = edges.length > 0
  const isConditionalEdgeCreated = edges.filter((edge) => edge.animated).length > 0

  useEffect(() => {
    const isWelcomeModalDismissed = localStorage.getItem('welcomeModalDismissed')
    if (isWelcomeModalDismissed !== 'true') {
      setModals({ ...modals, showWelcomeModal: true })
    } else {
      const isNodeModalDismissed = localStorage.getItem('createNodeModalDismissed')
      if (isNodeModalDismissed !== 'true') {
        setModals({ ...modals, showCreateNodeModal: true })
      }
    }
  }, [])

  const handleWelcomeModalClose = () => {
    setModals((prevModals) => ({ ...prevModals, showWelcomeModal: false }))
    localStorage.setItem('welcomeModalDismissed', 'true')

    const isNodeModalDismissed = localStorage.getItem('createNodeModalDismissed')
    if (isNodeModalDismissed !== 'true') {
      setModals((prevModals) => ({ ...prevModals, showCreateNodeModal: true }))
    }
  }

  const handleCreateNodeModalClose = () => {
    if (isNodeOneCreated) {
      setModals((prevModals) => ({ ...prevModals, showCreateNodeModal: false }))
      localStorage.setItem('createNodeModalDismissed', 'true')
      setModals((prevModals) => ({ ...prevModals, showCreateEdgeModal: true }))
    } else {
      alert('Please create a node before continuing!')
    }
  }

  const handleCreateEdgeModalClose = () => {
    if (isEdgeOneCreated) {
      setModals((prevModals) => ({ ...prevModals, showCreateEdgeModal: false }))
      localStorage.setItem('createEdgeModalDismissed', 'true')
      setModals((prevModals) => ({ ...prevModals, showConditionalEdgeModal: true }))
    } else {
      alert('Please create an edge before continuing!')
    }
  }

  const handleConditionalEdgeModalClose = () => {
    if (isConditionalEdgeCreated) {
      setModals((prevModals) => ({ ...prevModals, showConditionalEdgeModal: false }))
      localStorage.setItem('conditionalEdgeModalDismissed', 'true')
      setModals((prevModals) => ({ ...prevModals, showRenameModal: true }))
    } else {
      alert('Please create a conditional edge before continuing!')
    }
  }

  const handleRenameModalClose = () => {
    setModals((prevModals) => ({ ...prevModals, showRenameModal: false }))
    localStorage.setItem('renameModalDismissed', 'true')
    setModals((prevModals) => ({ ...prevModals, showGenerateCodeModal: true }))
  }

  const handleGenerateCodeModalClose = () => {
    setModals((prevModals) => ({ ...prevModals, showGenerateCodeModal: false }))
    localStorage.setItem('generateCodeModalDismissed', 'true')
  }

  const genericModalArray = [
    {
      noClickThrough: true,
      imageUrl: '/langgraph-logo.png',
      isOpen: modals.showWelcomeModal,
      onClose: handleWelcomeModalClose,
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
      hideBackDrop: true,
      className: 'absolute top-1/2 left-10 transform -translate-y-1/2',
      isOpen: modals.showCreateNodeModal,
      onClose: handleCreateNodeModalClose,
      title: 'Create a node',
      content: 'To create a node, click anywhere on the screen. Move a node by clicking and dragging it',
      buttonText: 'Continue',
    },
    {
      hideBackDrop: true,
      className: 'absolute top-10 left-1/2 transform -translate-x-1/2',
      isOpen: modals.showCreateEdgeModal,
      onClose: handleCreateEdgeModalClose,
      title: 'Create an edge',
      content: 'To create an edge, click and drag from the top/bottom of one node to another node',
      buttonText: 'Continue',
    },
    {
      hideBackDrop: true,
      isOpen: modals.showConditionalEdgeModal,
      className: 'absolute top-1/2 left-10 transform -translate-y-1/2',
      onClose: handleConditionalEdgeModalClose,
      title: 'Create a conditional edge',
      content:
        'Edges are non-conditional by default. To create a conditional edge, click on a non-conditional edge or draw multiple edges leaving from the same node',
      buttonText: 'Continue',
    },
    {
      hideBackDrop: true,
      className: 'absolute top-10 left-1/2 transform -translate-x-1/2',
      isOpen: modals.showRenameModal,
      onClose: handleRenameModalClose,
      title: 'Delete an edge',
      content: 'Double click quickly on an edge to delete it',
      buttonText: 'Continue',
    },
    {
      isOpen: modals.showGenerateCodeModal,
      onClose: handleGenerateCodeModalClose,
      title: 'Happy building!',
      content:
        "Once you're done prototyping, click Generate Code in the bottom right corner to get LangGraph code based on your nodes and edges",
      buttonText: 'Finish',
    },
  ]

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
    <div ref={reactFlowWrapper} className='z-10 no-scrollbar' style={{ width: '100vw', height: '100vh' }}>
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

      <Toolbar setActiveIcon={setActiveIcon} activeIcon={activeIcon} setIsLocked={setIsLocked} isLocked={isLocked} />

      {genericModalArray.map((modal, index) => {
        return <GenericModal key={index} {...modal} />
      })}
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
  )
}
