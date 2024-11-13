import { type CustomNodeType } from '@/components/nodes'
import { type CustomEdgeType } from '@/components/edges'

export function generateLanggraphCode(
  nodes: CustomNodeType[],
  edges: CustomEdgeType[],
  buttonTexts: { [key: string]: string },
  edgeLabels: { [key: string]: string },
): string {
  const sourceEdges = edges.filter(
    (edge) => !edge.animated && edges.filter((e) => e.source === edge.source && !e.animated).length > 1,
  )

  const hasConditionalEdges = edges.some((edge) => edge.animated)

  const imports = ['from langgraph.graph import StateGraph, START, END', 'from typing import TypedDict']
  if (hasConditionalEdges) {
    imports[1] = 'from typing import TypedDict, Literal'
  }
  if (sourceEdges.length > 1) {
    imports[1] += ', Annotated'
    imports.push('import operator')
  }
  if (nodes.length > 1) {
    imports.push('from langchain_core.runnables.config import RunnableConfig')
  }
  imports.push('\n')
  const getNodeLabel = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    const buttonText = buttonTexts[nodeId]
    return (buttonText || (node?.data?.label as string) || nodeId).replace(/\s+/g, '_')
  }

  const functions = nodes
    .filter((node) => node.type !== 'source' && node.type !== 'end')
    .map(
      (node) =>
        `def ${(buttonTexts[node.id] || (node?.data?.label as string) || node.id).replace(/\s+/g, '_')}(state: State, config: RunnableConfig) -> State:\n    return {} \n`,
    )

  const conditionalFunctions = new Map()
  edges
    .filter((edge) => edge.animated)
    .forEach((edge) => {
      const sourceLabel = getNodeLabel(edge.source)
      const targetLabel = getNodeLabel(edge.target)
      const edgeLabel = edgeLabels[edge.source] || `default_edge_name`
      if (!conditionalFunctions.has(edgeLabel)) {
        conditionalFunctions.set(edgeLabel, { source: sourceLabel, targets: new Set() })
      }
      conditionalFunctions.get(edgeLabel).targets.add(targetLabel)
    })

  const conditionalFunctionStrings = Array.from(conditionalFunctions.entries()).map(
    ([edgeLabel, { source, targets }]) => {
      const targetStrings = Array.from(targets)
        .map((target) => (target === 'end' ? '    # return END' : `    # return "${target}"`))
        .join('\n')
      const literalTypes = Array.from(targets)
        .map((target) => (target === 'end' ? 'END' : `'${target}'`))
        .join(', ')
      return `def ${edgeLabel}(state: State, config: RunnableConfig) -> Literal[${literalTypes}]:\n    """Function to handle conditional edges for ${source}"""\n${targetStrings}\n`
    },
  )

  const stateClass = [
    'class State(TypedDict): \n    """State class for the agent"""\n    # Add your state variables here\n',
  ]
  if (sourceEdges.length > 1) {
    stateClass.push(`    """Parallel execution detected: Use a reducer to prevent conflicts from writing to the same key"""
    """Example state variable and reducer is below"""
    node_return: Annotated[list, operator.add]\n`)
  }

  const workflowFunction = ['workflow = StateGraph(State)', '', '# Add nodes to the graph']

  nodes
    .filter((node) => node.type !== 'source' && node.type !== 'end')
    .forEach((node) => {
      workflowFunction.push(
        `workflow.add_node("${(buttonTexts[node.id] || (node?.data?.label as string) || node.id).replace(/\s+/g, '_')}", ${(
          buttonTexts[node.id] ||
          (node?.data?.label as string) ||
          node.id
        ).replace(/\s+/g, '_')})`,
      )
    })

  workflowFunction.push('', '# Define edges')

  const processedConditionalEdges = new Set()

  edges.forEach((edge) => {
    const sourceLabel = getNodeLabel(edge.source)
    const targetLabel = getNodeLabel(edge.target)
    if (edge.animated) {
      const edgeLabel = edgeLabels[edge.source] || `default_edge_name`
      if (!processedConditionalEdges.has(edgeLabel)) {
        if (sourceLabel === 'source') {
          workflowFunction.push(`workflow.add_conditional_edges(START, ${edgeLabel})`)
        } else {
          workflowFunction.push(`workflow.add_conditional_edges("${sourceLabel}", ${edgeLabel})`)
        }
        processedConditionalEdges.add(edgeLabel)
      }
    } else {
      if (targetLabel === 'end') {
        workflowFunction.push(`workflow.add_edge("${sourceLabel}", END)`)
      } else if (sourceLabel == 'source') {
        workflowFunction.push(`workflow.add_edge(START, "${targetLabel}")`)
      } else {
        if (sourceLabel != 'source') workflowFunction.push(`workflow.add_edge("${sourceLabel}", "${targetLabel}")`)
      }
    }
  })

  const graph = `\ngraph=workflow.compile()`

  const codeParts = [...imports, ...stateClass, ...functions, ...conditionalFunctionStrings, ...workflowFunction, graph]

  return codeParts.join('\n')
}
