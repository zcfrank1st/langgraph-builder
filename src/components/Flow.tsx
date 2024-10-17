"use client"
import { useCallback, useState, useEffect, useRef } from 'react'
import {
  Background,
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  OnConnectStart,
  type OnConnect,
  useOnSelectionChange,
  applyEdgeChanges,
  applyNodeChanges,
  type Node,
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
import Modal from './Modal'
import { useEdgeLabel } from '@/contexts/EdgeLabelContext'
import EdgeLabelModal from './EdgeLabelModal'
import { Button, Modal as MuiModal, ModalDialog } from "@mui/joy"
import GenericModal from './GenericModal'

export default function App() {
  const proOptions = { hideAttribution: true }
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<CustomEdgeType>(initialEdges)
  const [generateCodeModalOpen, setGenerateCodeModalOpen] = useState(false)
  const reactFlowWrapper = useRef<any>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastClickTime, setLastClickTime] = useState(0)
  const [generatedCode, setGeneratedCode] = useState<CodeGenerationResult | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [codeType, setCodeType] = useState<'js' | 'python' | null>(null)
  const { buttonTexts } = useButtonText()
  const [maxNodeLength, setMaxNodeLength] = useState(0)
  const [maxEdgeLength, setMaxEdgeLength] = useState(0)

  const { edgeLabels, updateEdgeLabel } = useEdgeLabel()

  const [isEdgeLabelModalOpen, setIsEdgeLabelModalOpen] = useState(false)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  const [modals, setModals] = useState({
    showWelcomeModal: false,
    showCreateNodeModal: false,
    showCreateEdgeModal: false,
    showConditionalEdgeModal: false,
    showRenameModal: false,
    showGenerateCodeModal: false,
  });

  const isNodeOneCreated = nodes.length > 2;
  const isEdgeOneCreated = edges.length > 0;
  const isConditionalEdgeCreated = edges.filter((edge) => edge.animated).length > 0;

  useEffect(() => {
    const isWelcomeModalDismissed = localStorage.getItem('welcomeModalDismissed');
    if (isWelcomeModalDismissed !== 'true') {
      setModals({ ...modals, showWelcomeModal: true });
    } else {
      const isNodeModalDismissed = localStorage.getItem('createNodeModalDismissed');
      if (isNodeModalDismissed !== 'true') {
        setModals({ ...modals, showCreateNodeModal: true });
      }
    }
  }, []);

  const handleWelcomeModalClose = () => {
    setModals((prevModals) => ({ ...prevModals, showWelcomeModal: false }));
    localStorage.setItem('welcomeModalDismissed', 'true');

    const isNodeModalDismissed = localStorage.getItem('createNodeModalDismissed');
    if (isNodeModalDismissed !== 'true') {
      setModals((prevModals) => ({ ...prevModals, showCreateNodeModal: true }));
    }
  };

  const handleCreateNodeModalClose = () => {
    if (isNodeOneCreated) {
      setModals((prevModals) => ({ ...prevModals, showCreateNodeModal: false }));
      localStorage.setItem("createNodeModalDismissed", "true");
      setModals((prevModals) => ({ ...prevModals, showCreateEdgeModal: true }));
    } else {
      alert("Please create a node before continuing!");
    }
  };

  const handleCreateEdgeModalClose = () => {
    if (isEdgeOneCreated) {
      setModals((prevModals) => ({ ...prevModals, showCreateEdgeModal: false }));
      localStorage.setItem("createEdgeModalDismissed", "true");
      setModals((prevModals) => ({ ...prevModals, showConditionalEdgeModal: true }));
    } else {
      alert("Please create an edge before continuing!");
    }
  };

  const handleConditionalEdgeModalClose = () => {
    if (isConditionalEdgeCreated) {
      setModals((prevModals) => ({ ...prevModals, showConditionalEdgeModal: false }));
      localStorage.setItem('conditionalEdgeModalDismissed', 'true')
      setModals((prevModals) => ({ ...prevModals, showRenameModal: true }));
    } else {
      alert("Please create a conditional edge before continuing!");
    }
  }

  const handleRenameModalClose = () => {
    setModals((prevModals) => ({ ...prevModals, showRenameModal: false }));
    localStorage.setItem('renameModalDismissed', 'true')
    setModals((prevModals) => ({ ...prevModals, showGenerateCodeModal: true }));
  }

  const handleGenerateCodeModalClose = () => {
    setModals((prevModals) => ({ ...prevModals, showGenerateCodeModal: false }));
    localStorage.setItem('generateCodeModalDismissed', 'true')
  }


  const genericModalArray = [
    {
     noClickThrough: true,
     imageUrl: "/langgraph-logo.png",
     isOpen: modals.showWelcomeModal,
     onClose: handleWelcomeModalClose,
     title: "Graph Builder",
     content: <span>Use this tool to quickly prototype the architecture of your agent. If you're new to LangGraph, check out our docs <a style={{textDecoration: 'underline'}} href='https://langchain-ai.github.io/langgraph/tutorials/introduction/' target='_blank' rel='noopener noreferrer'>here</a></span>,
     buttonText: "Get Started",
    },
    {
      hideBackDrop: true,
      className: 'absolute top-1/2 left-10 transform -translate-y-1/2',
      isOpen: modals.showCreateNodeModal,
      onClose: handleCreateNodeModalClose,
      title: "Create a node",
      content: "To create a node, click anywhere on the screen. Move a node by clicking and dragging it",
      buttonText: "Continue",
    },
    {
      hideBackDrop: true,
      className: 'absolute top-10 left-1/2 transform -translate-x-1/2',
      isOpen: modals.showCreateEdgeModal,
      onClose: handleCreateEdgeModalClose,
      title: "Create an edge",
      content: "To create an edge, click and drag from the top/bottom of one node to another node",
      buttonText: "Continue",
    },
    {
      hideBackDrop: true,
      isOpen: modals.showConditionalEdgeModal,
      className: 'absolute top-1/2 left-10 transform -translate-y-1/2',
      onClose: handleConditionalEdgeModalClose, 
      title: "Create a conditional edge",
      content: "Edges are non-conditional by default. To create a conditional edge, click on a non-conditional edge or draw multiple edges leaving from the same node",
      buttonText: "Continue",
    },
    {
      hideBackDrop: true,
      className: 'absolute top-10 left-1/2 transform -translate-x-1/2',
      isOpen: modals.showRenameModal,
      onClose: handleRenameModalClose,
      title: "Delete an edge",
      content: "Double click quickly on an edge to delete it",
      buttonText: "Continue",
    },
    {
      isOpen: modals.showGenerateCodeModal,
      onClose: handleGenerateCodeModalClose,
      title: "Happy building!",
      content: "Once you're done prototyping, click Generate Code in the bottom right corner to get LangGraph code based on your nodes and edges",
      buttonText: "Finish",
    },
  ]


  const handleEdgeLabelClick = useCallback((sourceNodeId: string) => {
    setSelectedEdgeId(sourceNodeId)
    setIsEdgeLabelModalOpen(true)
  }, [])

  const handleEdgeLabelSave = useCallback(
    (newLabel: string) => {
      if (selectedEdgeId) {
        updateEdgeLabel(selectedEdgeId, newLabel)
      }
      setIsEdgeLabelModalOpen(false)
    },
    [selectedEdgeId, updateEdgeLabel],
  )

  const onConnectStart: OnConnectStart = useCallback(
    (connection) => {
      console.log('onConnectStart', connection)
      setIsConnecting(true)
    },
    [nodes, setIsConnecting],
  )

  const onConnect: OnConnect = useCallback(
    (connection) => {
      console.log('onConnect', connection)
      const edgeId = `edge-${maxEdgeLength + 1}`
      setMaxEdgeLength(maxEdgeLength + 1)
      const defaultLabel = `conditional_${buttonTexts[connection.source] ? buttonTexts[connection.source].replace(/\s+/g, '_') : 'default'}`
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
        
        // Check if there are other edges from the same source
        const sourceEdges = updatedEdges.filter((edge) => edge.source === connection.source)

        if (sourceEdges.length > 1) {
          // If there are multiple edges from the same source, make them all conditional
          return updatedEdges.map((edge) =>
            edge.source === connection.source
              ? {
                  ...edge,
                  animated: true,
                  label: edgeLabels[edge.id] || defaultLabel || edge.label,
                }
              : edge,
          )
        }

        return updatedEdges
      })
    },
    [setEdges, edges, buttonTexts, updateEdgeLabel, edgeLabels, maxEdgeLength],
  )

  const onChange = useCallback(
    ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
      console.log('Flow changed:', nodes, edges)
      if (edges.length == 0) return

      const currentTime = new Date().getTime()
      if (currentTime - lastClickTime < 300) {
        // Double-click detected (300ms threshold)
        setEdges((edgs) =>
          applyEdgeChanges(
            [
              {
                type: 'remove',
                id: edges[0].id,
              },
            ],
            edgs,
          ),
        )
      } else {
        setEdges((edgs) => {
          const defaultLabel = `conditional_${buttonTexts[edges[0].source] ? buttonTexts[edges[0].source].replace(/\s+/g, '_') : 'default'}`
          const label = edgeLabels[edges[0].id] || defaultLabel
          // updateEdgeLabel(edges[0].id, label)
          return applyEdgeChanges(
            [
              {
                type: 'replace',
                id: edges[0].id,
                item: {
                  ...edges[0],
                  source: edges[0].source,
                  target: edges[0].target,
                  animated: !edges[0].animated,
                  selected: false,
                  label: label,
                },
              },
            ],
            edgs,
          )
        })
      }
      setLastClickTime(currentTime)
    },
    [edges, setEdges, lastClickTime],
  )

  useOnSelectionChange({ onChange })

  const addNode = useCallback(
    (event: React.MouseEvent) => {
      if (isConnecting) {
        setIsConnecting(false)
        return
      }
      event.preventDefault()
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
            prevNodes
          );
        });
      }
    },
    [nodes, setNodes, reactFlowInstance, reactFlowWrapper, isConnecting, applyNodeChanges, maxNodeLength],
  )

  const handleGenerateCode = () => {
    setShowModal(true)
  }

  const handleCodeTypeSelection = (type: 'js' | 'python') => {
    setCodeType(type)
    setShowModal(false)

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
      navigator.clipboard.writeText(generatedCode.code)
        .then(() => {
          alert("Code copied to clipboard!");
        })
        .catch(err => {
          console.error("Failed to copy code: ", err);
        });
    }
  }

  console.log(nodes)
  console.log(edges)

  return (
    <div ref={reactFlowWrapper} className='z-10 no-scrollbar' style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow<CustomNodeType, CustomEdgeType>
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        edges={edges.map((edge) => ({
          ...edge,
          label: edgeLabels[edge.source] || edge.label,
          data: { ...edge.data, onLabelClick: () => handleEdgeLabelClick(edge.source) },
        }))}
        edgeTypes={edgeTypes}
        onEdgesChange={onEdgesChange}
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
      >
        <Background />
      </ReactFlow>
      <Button
        onClick={handleGenerateCode}
        className='absolute bottom-4 right-4 bg-[#246161] hover:bg-[#195656] text-white font-bold py-2 px-4 rounded'
      >
        Generate Code
      </Button>
      {
        genericModalArray.map((modal, index) => {
          return (
            <GenericModal key={index} {...modal} />
          )
        })
      }
      {showModal && <Modal onClose={() => setShowModal(false)} onSelect={handleCodeTypeSelection} />}
      <MuiModal
      hideBackdrop={false}
      onClose={() => {
          setGenerateCodeModalOpen(false);
      }}
      open={generateCodeModalOpen}>
        <ModalDialog className="bg-slate-150">
        <div className='flex justify-center items-center h-full'>
        <div className='bg-slate-100 px-5 py-6 rounded-lg flex flex-col justify-center'>
          <h3 className='text-lg font-bold mb-2'>Generated Code:</h3>
          <pre className='bg-gray-100 px-3 rounded my-5'>
            <code>{generatedCode?.code}</code>
          </pre>
          <div className='flex flex-row justify-center'>
          <Button className='bg-[#246161] hover:bg-[#195656] text-white font-bold px-2 rounded w-32' onClick={copyCodeToClipboard}>
            Copy Code
          </Button>
          </div>
        </div>
        </div>
        </ModalDialog>
       </MuiModal>
      <EdgeLabelModal
        isOpen={isEdgeLabelModalOpen}
        onClose={() => setIsEdgeLabelModalOpen(false)}
        onSave={handleEdgeLabelSave}
        initialLabel={selectedEdgeId ? edgeLabels[selectedEdgeId] || '' : ''}
      />
    </div>
  )
}
