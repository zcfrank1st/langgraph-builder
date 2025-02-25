'use client'

import React, { useState } from 'react'

const MultiButton = ({ options = ['Python', 'Typescript'] }) => {
  const [selectedOption, setSelectedOption] = useState(0)

  return (
    <div className='w-full max-w-xs'>
      <div className='rounded-lg border border-gray-200 bg-white p-1 flex shadow-sm'>
        <button
          className={`flex-1 py-2 px-6 text-lg font-medium transition-colors duration-800 ease-in-out ${
            selectedOption === 0 ? 'text-gray-700' : 'text-gray-300'
          }`}
          onClick={() => setSelectedOption(0)}
        >
          {options[0]}
        </button>

        <button
          className={`flex-1 py-2 border-l border-gray-200 px-6 text-lg font-medium transition-colors ${
            selectedOption === 1 ? 'text-gray-700' : 'text-gray-400'
          }`}
          onClick={() => setSelectedOption(1)}
        >
          {options[1]}
        </button>
      </div>
    </div>
  )
}

export default MultiButton
