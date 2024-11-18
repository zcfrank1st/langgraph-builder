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
    const label = buttonText || (node?.data?.label as string) || nodeId
    return (label === 'source' ? 'START' : label === 'end' ? 'END' : label).replace(/\s+/g, '_')
  }

  const functions = nodes
    .filter((node) => node.type !== 'source' && node.type !== 'end')
    .map(
      (node) =>
        `def ${(buttonTexts[node.id] || (node?.data?.label as string) || node.id).replace(/\s+/g, '_')}(state: State, config: RunnableConfig) -> State:\n    return {} \n`,
    )
  const conditionalFunctionsMap = new Map<string, { source: string; targets: Set<string> }>()

  edges
    .filter((edge) => edge.animated)
    .forEach((edge) => {
      const edgeLabel = edge.label as string
      console.log(edgeLabel, 'edgeLabel')
      const sourceLabel = getNodeLabel(edge.source)
      const targetLabel = getNodeLabel(edge.target)

      if (!conditionalFunctionsMap.has(edgeLabel)) {
        conditionalFunctionsMap.set(edgeLabel, { source: sourceLabel, targets: new Set() })
      }
      conditionalFunctionsMap.get(edgeLabel)!.targets.add(targetLabel)
    })

  console.log(conditionalFunctionsMap, 'conditionalFunctionsMap')

  const conditionalFunctionStrings = Array.from(conditionalFunctionsMap.entries()).map(
    ([edgeLabel, { source, targets }]) => {
      const functionName = `${edgeLabel}`
      const targetStrings = Array.from(targets)
        .map((target) => (target === 'END' ? '    # return END' : `    # return "${target}"`))
        .join('\n')
      const literalTypes = Array.from(targets)
        .map((target) => (target === 'END' ? 'END' : `'${target}'`))
        .join(', ')
      return `def ${functionName}(state: State, config: RunnableConfig) -> Literal[${literalTypes}]:\n    """Function to handle conditional edge '${edgeLabel}' from ${source}"""\n${targetStrings}\n`
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
    const edgeLabel = edge.label as string
    const sourceLabel = getNodeLabel(edge.source)
    const targetLabel = getNodeLabel(edge.target)

    if (edge.animated) {
      if (!processedConditionalEdges.has(edgeLabel)) {
        const functionName = `${edgeLabel}`
        if (sourceLabel === 'START') {
          workflowFunction.push(`workflow.add_conditional_edges("START", ${functionName})`)
        } else {
          workflowFunction.push(`workflow.add_conditional_edges("${sourceLabel}", ${functionName})`)
        }
        processedConditionalEdges.add(edgeLabel)
      }
    } else {
      if (targetLabel === 'END') {
        workflowFunction.push(`workflow.add_edge("${sourceLabel}", END)`)
      } else if (sourceLabel == 'START') {
        workflowFunction.push(`workflow.add_edge(START, "${targetLabel}")`)
      } else {
        if (sourceLabel != 'START') workflowFunction.push(`workflow.add_edge("${sourceLabel}", "${targetLabel}")`)
      }
    }
  })

  const graph = `\ngraph=workflow.compile()`

  const codeParts = [...imports, ...stateClass, ...functions, ...conditionalFunctionStrings, ...workflowFunction, graph]

  return codeParts.join('\n')
}
