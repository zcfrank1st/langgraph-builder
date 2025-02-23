import type { NextApiRequest, NextApiResponse } from 'next'

const LANGGRAPH_API_URL = 'https://langgraph-gen-570601939772.us-central1.run.app/generate'

type GenerateResponse = {
  stub?: string
  implementation?: string
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<GenerateResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Example/dummy data matching the required schema
    const dummyPayload = {
      spec: `name: CustomAgent
entrypoint: start
nodes:
    - name: start
    - name: process
    - name: decide
edges:
    - from: start
      to: process
    - from: process
      to: decide
    - from: decide
      condition: check_decision
      paths:
          continue: process
          end: end`,
      language: 'typescript',
      format: 'yaml',
    }

    const response = await fetch(LANGGRAPH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dummyPayload),
    })

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`)
    }

    const data = await response.json()
    console.log(data, 'DATA FROM API')
    return res.status(200).json({
      stub: data.stub,
      implementation: data.implementation,
    })
  } catch (error) {
    console.error('Error generating code:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate code',
    })
  }
}
