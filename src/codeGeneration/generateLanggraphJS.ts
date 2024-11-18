import { type CustomNodeType } from '@/components/nodes'
import { type CustomEdgeType } from '@/components/edges'

export function generateLanggraphJS(
  nodes: CustomNodeType[],
  edges: CustomEdgeType[],
  buttonTexts: { [key: string]: string },
  edgeLabels: { [key: string]: string },
): string {
  console.log(edgeLabels, 'edgeLabels')
  const sourceEdges = edges.filter(
    (edge) => !edge.animated && edges.filter((e) => e.source === edge.source && !e.animated).length > 1,
  )
  const getNodeLabel = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    const buttonText = buttonTexts[nodeId]
    const label = buttonText || (node?.data?.label as string) || nodeId

    if (label === 'source') {
      return 'START'
    } else if (label === 'end') {
      return 'END'
    } else {
      return label.replace(/\s+/g, '_')
    }
  }

  const importArray = ['StateGraph', 'START', 'END', 'Annotation']

  if (sourceEdges.length > 1) {
    importArray.push('Annotated')
  }
  const imports = [`import { ${importArray.join(', ')} } from '@langchain/langgraph';`]
  if (sourceEdges.length > 1) {
    imports.push('import { BaseMessage } from "@langchain/core/messages";')
  }
  const stateArray = []

  if (sourceEdges.length > 1) {
    stateArray.push(
      '    // Parallel execution detected: Use a reducer to prevent conflicts from writing to the same key',
    )
    stateArray.push('    // Example state variable and reducer is below')
    stateArray.push('    messages: Annotated<BaseMessage[]>({')
    stateArray.push('        reducer: (x, y) => x.concat(y),')
    stateArray.push('        default: () => [],')
    stateArray.push('    })')
  }

  const stateDefinition = [
    'const StateAnnotation = Annotation.Root({',
    '    // Define your state properties here',
    ...stateArray,
    '});',
  ]

  const functions = nodes
    .filter((node) => node.type !== 'source' && node.type !== 'end')
    .map((node) => {
      const functionName = (buttonTexts[node.id] || (node?.data?.label as string) || node.id).replace(/\s+/g, '_')
      return `function ${functionName}(state) {\n    return {};\n  }\n`
    })

  const conditionalFunctionsMap = new Map<string, { source: string; targets: Set<string> }>()

  edges
    .filter((edge) => edge.animated)
    .forEach((edge) => {
      const edgeLabel = edge.label as string
      const sourceLabel = getNodeLabel(edge.source)
      const targetLabel = getNodeLabel(edge.target)

      if (!conditionalFunctionsMap.has(edgeLabel)) {
        conditionalFunctionsMap.set(edgeLabel, { source: sourceLabel, targets: new Set() })
      }
      conditionalFunctionsMap.get(edgeLabel)!.targets.add(targetLabel)
    })

  // Generate one function per edgeLabel
  const conditionalFunctionStrings = Array.from(conditionalFunctionsMap.entries()).map(([edgeLabel, { targets }]) => {
    const sanitizedEdgeLabel = edgeLabel.replace(/\W+/g, '_')
    const targetStrings = Array.from(targets)
      .map((target) => (target === 'END' ? '    // return END;' : `    // return "${target}";`))
      .join('\n')
    return `function ${edgeLabel}(state) {\n${targetStrings}\n  }\n`
  })

  const workflowFunction = ['const workflow = new StateGraph(StateAnnotation)']

  nodes
    .filter((node) => node.type !== 'source' && node.type !== 'end')
    .forEach((node) => {
      const nodeLabel = (buttonTexts[node.id] || (node?.data?.label as string) || node.id).replace(/\s+/g, '_')
      workflowFunction.push(`  .addNode("${nodeLabel}", ${nodeLabel})`)
    })

  workflowFunction.push('')

  const processedConditionalEdges = new Set()

  edges.forEach((edge) => {
    console.log(edge, 'edge inside map')
    const sourceLabel = getNodeLabel(edge.source)
    const targetLabel = getNodeLabel(edge.target)
    if (edge.animated) {
      const edgeLabel = edge.label as string
      if (!processedConditionalEdges.has(edgeLabel)) {
        if (sourceLabel === 'source') {
          workflowFunction.push(`  .addConditionalEdges(START, ${edgeLabel})`)
        } else {
          workflowFunction.push(`  .addConditionalEdges("${sourceLabel}", ${edgeLabel})`)
        }
        processedConditionalEdges.add(edgeLabel)
      }
    } else {
      if (targetLabel === 'end') {
        workflowFunction.push(`  .addEdge("${sourceLabel}", END)`)
      } else if (sourceLabel === 'source') {
        workflowFunction.push(`  .addEdge(START, "${targetLabel}")`)
      } else {
        workflowFunction.push(`  .addEdge("${sourceLabel}", "${targetLabel}")`)
      }
    }
  })

  const graph = `\nconst graph = workflow.compile();\nexport { graph };\n`

  const codeParts = [
    ...imports,
    '',
    ...stateDefinition,
    '',
    ...functions,
    ...conditionalFunctionStrings,
    ...workflowFunction,
    graph,
  ]

  return codeParts.join('\n')
}
