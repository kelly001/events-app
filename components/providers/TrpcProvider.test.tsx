import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import TrpcProvider from './TrpcProvider'

describe('TrpcProvider', () => {
  it('renders its children inside the query providers', () => {
    render(
      <TrpcProvider>
        <div>Provider child</div>
      </TrpcProvider>
    )

    expect(screen.getByText('Provider child')).toBeInTheDocument()
  })
})
